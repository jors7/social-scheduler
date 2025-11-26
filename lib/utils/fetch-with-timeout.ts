/**
 * Fetch with timeout utility
 * Provides consistent timeout handling for all fetch operations
 */

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds default

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetch with automatic timeout handling
 * @param url - The URL to fetch
 * @param options - Fetch options plus optional timeout (default: 30s)
 * @returns Promise<Response>
 * @throws Error if timeout is exceeded or fetch fails
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch JSON with timeout and automatic parsing
 * @param url - The URL to fetch
 * @param options - Fetch options plus optional timeout
 * @returns Promise<T> - Parsed JSON response
 */
export async function fetchJsonWithTimeout<T = any>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Timeout constants for different operation types
 */
export const TIMEOUT = {
  /** Quick API calls (auth, simple queries) */
  SHORT: 10000, // 10 seconds
  /** Standard API calls (posting text) */
  DEFAULT: 30000, // 30 seconds
  /** Long operations (media upload, video processing) */
  LONG: 60000, // 60 seconds
  /** Very long operations (large video upload) */
  EXTRA_LONG: 120000, // 2 minutes
} as const;
