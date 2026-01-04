/**
 * Structured Logger for the application
 * Provides consistent logging format across the app
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  userId?: string;
  requestId?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function formatLogEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level}]`,
    entry.context ? `[${entry.context}]` : '',
    entry.requestId ? `[req:${entry.requestId}]` : '',
    entry.userId ? `[user:${entry.userId}]` : '',
    entry.message,
  ].filter(Boolean);

  return parts.join(' ');
}

function createLogEntry(
  level: LogLevel,
  message: string,
  options?: {
    context?: string;
    userId?: string;
    requestId?: string;
    data?: Record<string, unknown>;
    error?: Error;
  }
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: options?.context,
    userId: options?.userId,
    requestId: options?.requestId,
    data: options?.data,
  };

  if (options?.error) {
    entry.error = {
      name: options.error.name,
      message: options.error.message,
      stack: options.error.stack,
    };
  }

  return entry;
}

class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  private log(
    level: LogLevel,
    message: string,
    options?: {
      userId?: string;
      requestId?: string;
      data?: Record<string, unknown>;
      error?: Error;
    }
  ): void {
    const entry = createLogEntry(level, message, {
      ...options,
      context: this.context,
    });

    const formattedMessage = formatLogEntry(entry);

    // In production, you might send to external service (Sentry, DataDog, etc.)
    // For now, use console with structured data
    switch (level) {
      case LogLevel.DEBUG:
        if (process.env.NODE_ENV === 'development') {
          console.debug(formattedMessage, entry.data || '');
        }
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, entry.error || entry.data || '');
        break;
    }
  }

  debug(
    message: string,
    options?: { userId?: string; requestId?: string; data?: Record<string, unknown> }
  ): void {
    this.log(LogLevel.DEBUG, message, options);
  }

  info(
    message: string,
    options?: { userId?: string; requestId?: string; data?: Record<string, unknown> }
  ): void {
    this.log(LogLevel.INFO, message, options);
  }

  warn(
    message: string,
    options?: { userId?: string; requestId?: string; data?: Record<string, unknown> }
  ): void {
    this.log(LogLevel.WARN, message, options);
  }

  error(
    message: string,
    options?: { userId?: string; requestId?: string; data?: Record<string, unknown>; error?: Error }
  ): void {
    this.log(LogLevel.ERROR, message, options);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    return new Logger(this.context ? `${this.context}:${context}` : context);
  }
}

// Export singleton instance for general use
export const logger = new Logger();

// Export factory for creating context-specific loggers
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Pre-configured loggers for common contexts
export const apiLogger = createLogger('API');
export const authLogger = createLogger('Auth');
export const dbLogger = createLogger('Database');
