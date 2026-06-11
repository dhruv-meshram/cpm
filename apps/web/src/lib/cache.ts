type CacheEntry = {
  data: any;
  expiresAt: number;
  createdAt: number;
};

class ApiCache {
  private store = new Map<string, CacheEntry>();
  
  // Metrics
  private hits = 0;
  private misses = 0;
  private invalidations = 0;
  private totalDbFetchTimeMs = 0;
  private fetchCount = 0;

  public async get<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (entry && entry.expiresAt > now) {
      this.hits++;
      const avgSavedTime = this.fetchCount > 0 ? (this.totalDbFetchTimeMs / this.fetchCount) : 0;
      console.log(`[Cache Hit] Key: "${key}" | Hits: ${this.hits} | Misses: ${this.misses} | Est. Saved Time: ${avgSavedTime.toFixed(2)}ms`);
      return entry.data as T;
    }

    this.misses++;
    const startDb = performance.now();
    const data = await fetchFn();
    const durationDb = performance.now() - startDb;
    
    this.totalDbFetchTimeMs += durationDb;
    this.fetchCount++;

    this.store.set(key, {
      data,
      expiresAt: now + ttlSeconds * 1000,
      createdAt: now,
    });

    console.log(`[Cache Miss] Key: "${key}" | Fetched in ${durationDb.toFixed(2)}ms | Hits: ${this.hits} | Misses: ${this.misses}`);

    return data;
  }

  public invalidate(pattern: string): void {
    let count = 0;
    // Escapes regex special chars except *
    const escaped = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, (m) => m === '*' ? '*' : '\\' + m);
    const regex = new RegExp('^' + escaped.replace(/\*/g, '.*') + '$');
    
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    this.invalidations += count;
    console.log(`[Cache Invalidate] Pattern: "${pattern}" | Removed ${count} keys | Total invalidations: ${this.invalidations}`);
  }

  public invalidateTask(projectId: string) {
    this.invalidate(`dashboard:tasks:*`);
    this.invalidate(`dashboard:summary:*`);
    this.invalidate(`dashboard:${projectId}:tasks`);
    this.invalidate(`dashboard:${projectId}:summary`);
  }

  public invalidateProject(projectId: string) {
    this.invalidate(`dashboard:projects:*`);
    this.invalidate(`dashboard:summary:*`);
    this.invalidate(`dashboard:${projectId}:summary`);
  }

  public invalidateTeam(projectId?: string) {
    this.invalidate(`dashboard:teams:*`);
    if (projectId) {
      this.invalidate(`dashboard:${projectId}:teams`);
    }
  }

  public invalidateDepartment(projectId: string) {
    this.invalidate(`dashboard:departments:*`);
    this.invalidate(`dashboard:${projectId}:departments`);
  }

  public invalidateNotifications(userId: string) {
    this.invalidate(`dashboard:notifications:${userId}`);
  }

  public invalidateApprovals(projectId?: string) {
    this.invalidate(`dashboard:approvals:*`);
    if (projectId) {
      this.invalidate(`dashboard:${projectId}:approvals`);
    }
  }

  public getMetrics() {
    const avgDbTime = this.fetchCount > 0 ? (this.totalDbFetchTimeMs / this.fetchCount) : 0;
    const totalSavedMs = this.hits * avgDbTime;

    return {
      hits: this.hits,
      misses: this.misses,
      invalidations: this.invalidations,
      averageDbResponseTimeMs: avgDbTime,
      totalResponseTimeSavedMs: totalSavedMs,
      hitRate: this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)) * 100 : 0
    };
  }
}

export const apiCache = new ApiCache();
