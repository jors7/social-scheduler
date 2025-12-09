/**
 * Retry with Exponential Backoff Utility
 * Provides consistent retry logic for platform API calls
 *
 * Uses conservative defaults: 3 attempts with 1s, 2s, 4s delays
 */

export interface RetryConfig {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 8000) */
  maxDelayMs?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Custom patterns to match for retryable errors */
  retryablePatterns?: string[];
  /** Callback on each retry attempt */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
}

/**
 * Default patterns that indicate a retryable error
 * Includes network errors, timeouts, and server errors (5xx)
 */
const DEFAULT_RETRYABLE_PATTERNS = [
  // Network errors
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'socket hang up',
  'network error',
  'fetch failed',
  // Rate limiting
  'rate limit',
  '429',
  'too many requests',
  // Server errors
  '500',
  '502',
  '503',
  '504',
  'internal server error',
  'bad gateway',
  'service unavailable',
  'gateway timeout',
  // Temporary issues
  'temporarily unavailable',
  'try again',
];

/**
 * Patterns that indicate a permanent error (should NOT retry)
 */
const PERMANENT_ERROR_PATTERNS = [
  // Authentication/Authorization
  '401',
  '403',
  'unauthorized',
  'forbidden',
  'invalid token',
  'expired token',
  'authentication failed',
  // Client errors
  '400',
  'bad request',
  'invalid',
  'not found',
  '404',
  // Content issues
  'duplicate',
  'already exists',
  'content too long',
  'media not supported',
];

/**
 * Check if an error is retryable based on its message
 */
function isRetryableError(error: Error, customPatterns?: string[]): boolean {
  const message = error.message.toLowerCase();

  // First check if it's a permanent error (should NOT retry)
  const isPermanent = PERMANENT_ERROR_PATTERNS.some(pattern =>
    message.includes(pattern.toLowerCase())
  );

  if (isPermanent) {
    return false;
  }

  // Check default retryable patterns
  const patterns = customPatterns || DEFAULT_RETRYABLE_PATTERNS;
  return patterns.some(pattern =>
    message.includes(pattern.toLowerCase())
  );
}

/**
 * Calculate delay for a given attempt using exponential backoff
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  // Add small jitter (±10%) to prevent thundering herd
  const jitter = 0.9 + Math.random() * 0.2;
  const delay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1) * jitter;
  return Math.min(delay, maxDelayMs);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry and exponential backoff
 *
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @returns Promise resolving to the function result
 * @throws The last error if all retries fail
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => postToFacebook(content, account),
 *   {
 *     maxAttempts: 3,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    backoffMultiplier = 2,
    retryablePatterns,
    onRetry,
  } = config;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this error is retryable
      const canRetry = isRetryableError(lastError, retryablePatterns);

      // If not retryable or last attempt, throw immediately
      if (!canRetry || attempt === maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = calculateDelay(attempt, baseDelayMs, maxDelayMs, backoffMultiplier);

      // Call retry callback if provided
      onRetry?.(attempt, lastError, delay);

      // Wait before next attempt
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Execute a function with retry, returning a result object instead of throwing
 *
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @returns Promise resolving to RetryResult object
 *
 * @example
 * ```typescript
 * const { success, result, error, attempts } = await retryWithBackoffSafe(
 *   () => postToFacebook(content, account)
 * );
 * if (!success) {
 *   console.error(`Failed after ${attempts} attempts: ${error.message}`);
 * }
 * ```
 */
export async function retryWithBackoffSafe<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<RetryResult<T>> {
  const maxAttempts = config.maxAttempts || 3;

  try {
    const result = await retryWithBackoff(fn, config);
    return {
      success: true,
      result,
      attempts: 1, // Note: We don't track actual attempts in this path
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      attempts: maxAttempts,
    };
  }
}

/**
 * Default retry configuration for platform API calls
 * Conservative: 3 attempts with 1s, 2s, 4s delays (max 8s)
 */
export const PLATFORM_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
  onRetry: (attempt, error, delay) => {
    console.log(JSON.stringify({
      event: 'platform_api_retry',
      attempt,
      error: error.message,
      delay_ms: Math.round(delay),
      timestamp: new Date().toISOString()
    }));
  }
};
