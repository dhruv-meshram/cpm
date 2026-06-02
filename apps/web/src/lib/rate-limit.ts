type RateLimitRecord = {
  count: number;
  resetAt: number;
};

// Simple in-memory store for rate limiting. 
// In a distributed production environment, Redis is strongly recommended.
const rateLimitStore = new Map<string, RateLimitRecord>();

interface RateLimitConfig {
  maxRequests: number;  // Max requests per window
  windowMs: number;     // Window size in milliseconds
}

/**
 * Checks if a given identifier has exceeded the rate limit.
 * @param identifier e.g., IP address or User ID
 * @param config Rate limit configuration
 * @returns boolean true if the request is allowed, false if rate limited
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return true;
  }

  // If window has expired, reset it
  if (now > record.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return true;
  }

  // Increment within the window
  if (record.count < config.maxRequests) {
    record.count++;
    return true;
  }

  // Rate limit exceeded
  return false;
}
