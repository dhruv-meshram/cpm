import Redis from 'ioredis';

class MockRedis {
  private store = new Map<string, string[]>();
  private ttls = new Map<string, number>();

  public async exists(key: string): Promise<number> {
    this.checkExpired(key);
    return this.store.has(key) ? 1 : 0;
  }

  public async lpush(key: string, ...values: string[]): Promise<number> {
    this.checkExpired(key);
    if (!this.store.has(key)) {
      this.store.set(key, []);
    }
    const list = this.store.get(key)!;
    list.unshift(...values);
    return list.length;
  }

  public async rpush(key: string, ...values: string[]): Promise<number> {
    this.checkExpired(key);
    if (!this.store.has(key)) {
      this.store.set(key, []);
    }
    const list = this.store.get(key)!;
    list.push(...values);
    return list.length;
  }

  public async lrange(key: string, start: number, stop: number): Promise<string[]> {
    this.checkExpired(key);
    const list = this.store.get(key) || [];
    const actualStop = stop < 0 ? list.length + stop + 1 : stop + 1;
    return list.slice(start, actualStop);
  }

  public async ltrim(key: string, start: number, stop: number): Promise<string> {
    this.checkExpired(key);
    const list = this.store.get(key);
    if (list) {
      const actualStop = stop < 0 ? list.length + stop + 1 : stop + 1;
      this.store.set(key, list.slice(start, actualStop));
    }
    return 'OK';
  }

  public async del(key: string): Promise<number> {
    const existed = this.store.has(key) ? 1 : 0;
    this.store.delete(key);
    this.ttls.delete(key);
    return existed;
  }

  public async expire(key: string, seconds: number): Promise<number> {
    if (this.store.has(key)) {
      this.ttls.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  public async delPattern(pattern: string): Promise<number> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        this.ttls.delete(key);
        count++;
      }
    }
    return count;
  }

  private checkExpired(key: string) {
    const expireAt = this.ttls.get(key);
    if (expireAt && expireAt < Date.now()) {
      this.store.delete(key);
      this.ttls.delete(key);
    }
  }
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let useMock = false;
let realRedis: Redis | null = null;
const mockRedis = new MockRedis();

try {
  realRedis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    lazyConnect: true
  });

  realRedis.on('error', (err) => {
    if (!useMock) {
      console.warn('[Redis] Connection failed, falling back to in-memory store:', err.message);
      useMock = true;
    }
  });

  realRedis.on('connect', () => {
    console.log('[Redis] Connected successfully.');
    useMock = false;
  });
} catch (e) {
  console.warn('[Redis] Failed to initialize client. Falling back to in-memory store.');
  useMock = true;
}

export const redis = {
  async exists(key: string): Promise<number> {
    if (useMock || !realRedis) return mockRedis.exists(key);
    try {
      return await realRedis.exists(key);
    } catch (e) {
      useMock = true;
      return mockRedis.exists(key);
    }
  },
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (useMock || !realRedis) return mockRedis.lpush(key, ...values);
    try {
      return await realRedis.lpush(key, ...values);
    } catch (e) {
      useMock = true;
      return mockRedis.lpush(key, ...values);
    }
  },
  async rpush(key: string, ...values: string[]): Promise<number> {
    if (useMock || !realRedis) return mockRedis.rpush(key, ...values);
    try {
      return await realRedis.rpush(key, ...values);
    } catch (e) {
      useMock = true;
      return mockRedis.rpush(key, ...values);
    }
  },
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (useMock || !realRedis) return mockRedis.lrange(key, start, stop);
    try {
      return await realRedis.lrange(key, start, stop);
    } catch (e) {
      useMock = true;
      return mockRedis.lrange(key, start, stop);
    }
  },
  async ltrim(key: string, start: number, stop: number): Promise<string> {
    if (useMock || !realRedis) return mockRedis.ltrim(key, start, stop);
    try {
      return await realRedis.ltrim(key, start, stop);
    } catch (e) {
      useMock = true;
      return mockRedis.ltrim(key, start, stop);
    }
  },
  async del(key: string): Promise<number> {
    if (useMock || !realRedis) return mockRedis.del(key);
    try {
      return await realRedis.del(key);
    } catch (e) {
      useMock = true;
      return mockRedis.del(key);
    }
  },
  async expire(key: string, seconds: number): Promise<number> {
    if (useMock || !realRedis) return mockRedis.expire(key, seconds);
    try {
      return await realRedis.expire(key, seconds);
    } catch (e) {
      useMock = true;
      return mockRedis.expire(key, seconds);
    }
  },
  async delPattern(pattern: string): Promise<number> {
    if (useMock || !realRedis) return mockRedis.delPattern(pattern);
    try {
      const keys = await realRedis.keys(pattern);
      if (keys.length > 0) {
        return await realRedis.del(...keys);
      }
      return 0;
    } catch (e) {
      useMock = true;
      return mockRedis.delPattern(pattern);
    }
  }
};
