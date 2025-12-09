/**
 * Circuit Breaker for Platform APIs
 * Prevents cascading failures by temporarily stopping requests to failing platforms
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, allowing limited requests
 *
 * Note: This is a single-instance circuit breaker. In a multi-instance deployment,
 * consider using Redis-based state for accurate cross-instance tracking.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in milliseconds before trying to close the circuit (recovery time) */
  recoveryTimeMs: number;
  /** Number of successful calls needed in HALF_OPEN to close circuit */
  successThreshold: number;
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastStateChange: number;
}

// In-memory storage for circuit breaker state
const circuitStore = new Map<string, CircuitBreakerState>();

// Default configuration
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,        // Open after 5 consecutive failures
  recoveryTimeMs: 60 * 1000,  // Try again after 1 minute
  successThreshold: 2,        // Need 2 successes to fully close
};

// Platform-specific configurations (can override defaults)
export const PLATFORM_CIRCUIT_CONFIGS: Record<string, Partial<CircuitBreakerConfig>> = {
  tiktok: {
    failureThreshold: 3,       // TikTok is more sensitive, open faster
    recoveryTimeMs: 2 * 60 * 1000, // Wait 2 minutes
  },
  instagram: {
    failureThreshold: 5,
    recoveryTimeMs: 60 * 1000,
  },
  threads: {
    failureThreshold: 5,
    recoveryTimeMs: 60 * 1000,
  },
  // Other platforms use defaults
};

/**
 * Get the configuration for a platform
 */
function getConfig(platform: string): CircuitBreakerConfig {
  const platformConfig = PLATFORM_CIRCUIT_CONFIGS[platform] || {};
  return {
    ...DEFAULT_CONFIG,
    ...platformConfig,
  };
}

/**
 * Get or initialize circuit breaker state for a platform
 */
function getState(platform: string): CircuitBreakerState {
  const existing = circuitStore.get(platform);
  if (existing) {
    return existing;
  }

  const initial: CircuitBreakerState = {
    state: 'CLOSED',
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    lastStateChange: Date.now(),
  };
  circuitStore.set(platform, initial);
  return initial;
}

/**
 * Check if requests are allowed to pass through the circuit breaker
 */
export function canCall(platform: string): boolean {
  const state = getState(platform);
  const config = getConfig(platform);
  const now = Date.now();

  switch (state.state) {
    case 'CLOSED':
      return true;

    case 'OPEN':
      // Check if recovery time has passed
      if (now - state.lastFailureTime >= config.recoveryTimeMs) {
        // Transition to HALF_OPEN
        state.state = 'HALF_OPEN';
        state.successes = 0;
        state.lastStateChange = now;
        circuitStore.set(platform, state);
        console.log(JSON.stringify({
          event: 'circuit_breaker_half_open',
          platform,
          recovery_time_ms: config.recoveryTimeMs,
          timestamp: new Date().toISOString(),
        }));
        return true;
      }
      return false;

    case 'HALF_OPEN':
      // Allow limited requests in half-open state
      return true;
  }
}

/**
 * Record a successful call - may close the circuit
 */
export function recordSuccess(platform: string): void {
  const state = getState(platform);
  const config = getConfig(platform);

  switch (state.state) {
    case 'CLOSED':
      // Reset failure count on success
      state.failures = 0;
      break;

    case 'HALF_OPEN':
      state.successes += 1;
      if (state.successes >= config.successThreshold) {
        // Transition to CLOSED
        state.state = 'CLOSED';
        state.failures = 0;
        state.lastStateChange = Date.now();
        console.log(JSON.stringify({
          event: 'circuit_breaker_closed',
          platform,
          successes: state.successes,
          timestamp: new Date().toISOString(),
        }));
      }
      break;

    case 'OPEN':
      // Shouldn't happen, but reset if it does
      state.failures = 0;
      break;
  }

  circuitStore.set(platform, state);
}

/**
 * Record a failed call - may open the circuit
 */
export function recordFailure(platform: string): void {
  const state = getState(platform);
  const config = getConfig(platform);
  const now = Date.now();

  switch (state.state) {
    case 'CLOSED':
      state.failures += 1;
      state.lastFailureTime = now;

      if (state.failures >= config.failureThreshold) {
        // Transition to OPEN
        state.state = 'OPEN';
        state.lastStateChange = now;
        console.log(JSON.stringify({
          event: 'circuit_breaker_opened',
          platform,
          failures: state.failures,
          recovery_time_ms: config.recoveryTimeMs,
          timestamp: new Date().toISOString(),
        }));
      }
      break;

    case 'HALF_OPEN':
      // Failure in half-open immediately opens circuit again
      state.state = 'OPEN';
      state.failures = config.failureThreshold; // Treat as full failures
      state.successes = 0;
      state.lastFailureTime = now;
      state.lastStateChange = now;
      console.log(JSON.stringify({
        event: 'circuit_breaker_reopened',
        platform,
        reason: 'failure_in_half_open',
        timestamp: new Date().toISOString(),
      }));
      break;

    case 'OPEN':
      // Already open, just update failure time
      state.lastFailureTime = now;
      break;
  }

  circuitStore.set(platform, state);
}

/**
 * Get detailed circuit breaker status for a platform
 */
export interface CircuitBreakerStatus {
  platform: string;
  state: CircuitState;
  failures: number;
  successes: number;
  canCall: boolean;
  timeUntilRetryMs?: number;
  config: CircuitBreakerConfig;
}

export function getStatus(platform: string): CircuitBreakerStatus {
  const state = getState(platform);
  const config = getConfig(platform);
  const allowed = canCall(platform);

  let timeUntilRetryMs: number | undefined;
  if (state.state === 'OPEN') {
    const elapsed = Date.now() - state.lastFailureTime;
    timeUntilRetryMs = Math.max(0, config.recoveryTimeMs - elapsed);
  }

  return {
    platform,
    state: state.state,
    failures: state.failures,
    successes: state.successes,
    canCall: allowed,
    timeUntilRetryMs,
    config,
  };
}

/**
 * Reset circuit breaker for a platform (useful for testing or manual recovery)
 */
export function reset(platform: string): void {
  circuitStore.delete(platform);
  console.log(JSON.stringify({
    event: 'circuit_breaker_reset',
    platform,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Reset all circuit breakers
 */
export function resetAll(): void {
  circuitStore.clear();
  console.log(JSON.stringify({
    event: 'circuit_breakers_reset_all',
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Get status of all circuit breakers
 */
export function getAllStatuses(): CircuitBreakerStatus[] {
  const platforms = ['facebook', 'instagram', 'threads', 'twitter', 'linkedin', 'bluesky', 'pinterest', 'tiktok', 'youtube'];
  return platforms.map(p => getStatus(p));
}
