/**
 * Structured Logger Utility
 * Provides consistent JSON logging for observability and debugging
 *
 * Outputs structured JSON logs that can be parsed by log aggregation tools
 * (Datadog, Logtail, Vercel Logs, etc.)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  event: string;
  [key: string]: unknown;
}

interface LogEntry extends LogContext {
  timestamp: string;
  level: LogLevel;
  service: string;
}

/**
 * Structured logger class for consistent JSON logging
 */
class StructuredLogger {
  constructor(private service: string) {}

  private formatEntry(level: LogLevel, ctx: LogContext): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      ...ctx
    };
    return JSON.stringify(entry);
  }

  debug(ctx: LogContext): void {
    // Only log debug in development
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      console.log(this.formatEntry('debug', ctx));
    }
  }

  info(ctx: LogContext): void {
    console.log(this.formatEntry('info', ctx));
  }

  warn(ctx: LogContext): void {
    console.warn(this.formatEntry('warn', ctx));
  }

  error(ctx: LogContext): void {
    console.error(this.formatEntry('error', ctx));
  }

  /**
   * Log with timing information
   * Returns a function to call when operation completes
   */
  timed(ctx: LogContext): () => void {
    const startTime = Date.now();
    this.info({ ...ctx, phase: 'start' });

    return () => {
      const duration_ms = Date.now() - startTime;
      this.info({ ...ctx, phase: 'complete', duration_ms });
    };
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, additionalContext);
  }
}

/**
 * Child logger that inherits parent context
 */
class ChildLogger {
  constructor(
    private parent: StructuredLogger,
    private context: Record<string, unknown>
  ) {}

  private mergeContext(ctx: LogContext): LogContext {
    return { ...this.context, ...ctx };
  }

  debug(ctx: LogContext): void {
    this.parent.debug(this.mergeContext(ctx));
  }

  info(ctx: LogContext): void {
    this.parent.info(this.mergeContext(ctx));
  }

  warn(ctx: LogContext): void {
    this.parent.warn(this.mergeContext(ctx));
  }

  error(ctx: LogContext): void {
    this.parent.error(this.mergeContext(ctx));
  }
}

// Pre-configured loggers for different services
export const cronLogger = new StructuredLogger('cron');
export const postingLogger = new StructuredLogger('posting');
export const queueLogger = new StructuredLogger('queue');
export const authLogger = new StructuredLogger('auth');
export const apiLogger = new StructuredLogger('api');

/**
 * Helper to extract safe error information for logging
 */
export function errorToLogContext(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      error_name: error.name,
      error_message: error.message,
      error_stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
  return {
    error_message: String(error)
  };
}

/**
 * Create a logger for a specific service
 */
export function createLogger(service: string): StructuredLogger {
  return new StructuredLogger(service);
}
