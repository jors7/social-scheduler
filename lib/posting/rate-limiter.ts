/**
 * Platform Rate Limiter
 * Simple in-memory rate limiting for social media platform APIs
 *
 * Note: This is a single-instance rate limiter. In a multi-instance deployment,
 * consider using Redis-based rate limiting for accurate cross-instance tracking.
 */

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Unique identifier for this limiter */
  name: string;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory storage for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Platform-specific rate limits based on API documentation
// These are conservative estimates to avoid hitting actual limits
export const PLATFORM_RATE_LIMITS: Record<string, RateLimitConfig> = {
  facebook: {
    name: 'facebook',
    maxRequests: 200,
    windowMs: 60 * 60 * 1000, // 200/hour
  },
  instagram: {
    name: 'instagram',
    maxRequests: 25,
    windowMs: 24 * 60 * 60 * 1000, // 25/day for media publishing
  },
  threads: {
    name: 'threads',
    maxRequests: 250,
    windowMs: 24 * 60 * 60 * 1000, // 250/day
  },
  twitter: {
    name: 'twitter',
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 200/15min
  },
  linkedin: {
    name: 'linkedin',
    maxRequests: 100,
    windowMs: 24 * 60 * 60 * 1000, // Conservative daily limit
  },
  bluesky: {
    name: 'bluesky',
    maxRequests: 300,
    windowMs: 5 * 60 * 1000, // 300/5min (AT Protocol)
  },
  pinterest: {
    name: 'pinterest',
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 100/hour
  },
  tiktok: {
    name: 'tiktok',
    maxRequests: 10,
    windowMs: 24 * 60 * 60 * 1000, // 10/day (sandbox mode is very limited)
  },
  youtube: {
    name: 'youtube',
    maxRequests: 50,
    windowMs: 24 * 60 * 60 * 1000, // Conservative daily limit
  },
};

/**
 * Get current rate limit status for a platform
 */
function getRateLimitEntry(platform: string, accountId: string): RateLimitEntry {
  const key = `${platform}:${accountId}`;
  const config = PLATFORM_RATE_LIMITS[platform];

  if (!config) {
    // Unknown platform - no rate limiting
    return { count: 0, windowStart: Date.now() };
  }

  const existing = rateLimitStore.get(key);
  const now = Date.now();

  if (!existing || now - existing.windowStart >= config.windowMs) {
    // Window expired or no entry - create new window
    const newEntry = { count: 0, windowStart: now };
    rateLimitStore.set(key, newEntry);
    return newEntry;
  }

  return existing;
}

/**
 * Check if a platform request is allowed under rate limits
 */
export function canMakeRequest(platform: string, accountId: string): boolean {
  const config = PLATFORM_RATE_LIMITS[platform];
  if (!config) {
    // Unknown platform - allow request (no rate limiting)
    return true;
  }

  const entry = getRateLimitEntry(platform, accountId);
  return entry.count < config.maxRequests;
}

/**
 * Record a request for rate limiting purposes
 * Call this AFTER a successful API request
 */
export function recordRequest(platform: string, accountId: string): void {
  const key = `${platform}:${accountId}`;
  const entry = getRateLimitEntry(platform, accountId);

  entry.count += 1;
  rateLimitStore.set(key, entry);
}

/**
 * Get remaining requests before rate limit is hit
 */
export function getRemainingRequests(platform: string, accountId: string): number {
  const config = PLATFORM_RATE_LIMITS[platform];
  if (!config) {
    return Infinity; // Unknown platform
  }

  const entry = getRateLimitEntry(platform, accountId);
  return Math.max(0, config.maxRequests - entry.count);
}

/**
 * Get time until rate limit window resets (in milliseconds)
 */
export function getTimeUntilReset(platform: string, accountId: string): number {
  const config = PLATFORM_RATE_LIMITS[platform];
  if (!config) {
    return 0;
  }

  const entry = getRateLimitEntry(platform, accountId);
  const elapsed = Date.now() - entry.windowStart;
  return Math.max(0, config.windowMs - elapsed);
}

/**
 * Get comprehensive rate limit info for a platform/account
 */
export interface RateLimitInfo {
  platform: string;
  accountId: string;
  allowed: boolean;
  remaining: number;
  total: number;
  resetInMs: number;
  resetAt: Date;
}

export function getRateLimitInfo(platform: string, accountId: string): RateLimitInfo {
  const config = PLATFORM_RATE_LIMITS[platform];
  const resetInMs = getTimeUntilReset(platform, accountId);

  return {
    platform,
    accountId,
    allowed: canMakeRequest(platform, accountId),
    remaining: getRemainingRequests(platform, accountId),
    total: config?.maxRequests || Infinity,
    resetInMs,
    resetAt: new Date(Date.now() + resetInMs),
  };
}

/**
 * Clear rate limit data (useful for testing)
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Clear rate limit for a specific platform/account
 */
export function clearRateLimit(platform: string, accountId: string): void {
  const key = `${platform}:${accountId}`;
  rateLimitStore.delete(key);
}
