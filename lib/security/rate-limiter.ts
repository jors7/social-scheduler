import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Initialize Redis client (lazy loaded)
let redis: Redis | null = null

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('Rate limiting disabled: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN not configured')
    return null
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }

  return redis
}

// Different rate limiters for different use cases
const rateLimiters: Record<string, Ratelimit | null> = {}

function getRateLimiter(
  type: 'auth' | 'ai' | 'api' | 'strict'
): Ratelimit | null {
  const redisClient = getRedis()
  if (!redisClient) return null

  if (!rateLimiters[type]) {
    switch (type) {
      case 'auth':
        // Auth endpoints: 10 requests per minute per IP
        rateLimiters[type] = new Ratelimit({
          redis: redisClient,
          limiter: Ratelimit.slidingWindow(10, '1 m'),
          prefix: 'ratelimit:auth:',
          analytics: true,
        })
        break
      case 'ai':
        // AI endpoints: 20 requests per minute per user
        rateLimiters[type] = new Ratelimit({
          redis: redisClient,
          limiter: Ratelimit.slidingWindow(20, '1 m'),
          prefix: 'ratelimit:ai:',
          analytics: true,
        })
        break
      case 'api':
        // General API: 100 requests per minute per IP
        rateLimiters[type] = new Ratelimit({
          redis: redisClient,
          limiter: Ratelimit.slidingWindow(100, '1 m'),
          prefix: 'ratelimit:api:',
          analytics: true,
        })
        break
      case 'strict':
        // Strict: 5 requests per minute (for sensitive ops like password reset)
        rateLimiters[type] = new Ratelimit({
          redis: redisClient,
          limiter: Ratelimit.slidingWindow(5, '1 m'),
          prefix: 'ratelimit:strict:',
          analytics: true,
        })
        break
    }
  }

  return rateLimiters[type] || null
}

/**
 * Get client identifier for rate limiting
 * Uses IP address with fallback to forwarded headers
 */
export function getClientIdentifier(): string {
  const headersList = headers()

  // Check various headers for real IP (behind proxies/CDN)
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  const cfConnectingIp = headersList.get('cf-connecting-ip')

  // Prefer Cloudflare IP, then forwarded, then real IP
  if (cfConnectingIp) return cfConnectingIp
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  if (realIp) return realIp

  // Fallback to a default (shouldn't happen in production)
  return 'unknown'
}

/**
 * Check rate limit and return error response if exceeded
 * Returns null if within limits, NextResponse if rate limited
 */
export async function checkRateLimit(
  identifier: string,
  type: 'auth' | 'ai' | 'api' | 'strict' = 'api'
): Promise<NextResponse | null> {
  const limiter = getRateLimiter(type)

  // If rate limiting is not configured, allow the request
  if (!limiter) {
    return null
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)

      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'You have exceeded the rate limit. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      )
    }

    return null
  } catch (error) {
    // If rate limiting fails (Redis down), allow the request but log the error
    console.error('Rate limiting error:', error)
    return null
  }
}

/**
 * Higher-order function to wrap an API handler with rate limiting
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  type: 'auth' | 'ai' | 'api' | 'strict' = 'api',
  identifierFn?: (request: Request) => string
) {
  return async (request: Request): Promise<Response> => {
    const identifier = identifierFn ? identifierFn(request) : getClientIdentifier()

    const rateLimitResponse = await checkRateLimit(identifier, type)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    return handler(request)
  }
}
