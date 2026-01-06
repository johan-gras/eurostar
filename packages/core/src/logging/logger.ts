/**
 * Structured logging with pino.
 *
 * Provides a configured logger with:
 * - JSON output in production
 * - Pretty output in development
 * - Child loggers for specific domains
 * - Request context support
 */

import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';

export type Logger = PinoLogger;

/**
 * Log levels supported by the logger.
 */
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**
 * Logger configuration options.
 */
export interface LoggerConfig {
  /** Log level (default: from LOG_LEVEL env or 'info') */
  level?: LogLevel;
  /** Service name for log context */
  service?: string;
  /** Enable pretty printing (default: true in development) */
  pretty?: boolean;
  /** Additional base context */
  context?: Record<string, unknown>;
}

/**
 * Determines if we're in development mode.
 */
function isDevelopment(): boolean {
  return process.env['NODE_ENV'] !== 'production';
}

/**
 * Creates a configured pino logger instance.
 *
 * @example
 * ```ts
 * const logger = createLogger({ service: 'gtfs-worker' });
 * logger.info({ trainId: '9001' }, 'Processing train update');
 * ```
 */
export function createLogger(config: LoggerConfig = {}): Logger {
  const {
    level = (process.env['LOG_LEVEL'] as LogLevel) ?? 'info',
    service = process.env['SERVICE_NAME'] ?? 'eurostar',
    pretty = isDevelopment(),
    context = {},
  } = config;

  const options: LoggerOptions = {
    level,
    base: {
      service,
      ...context,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  // Use pino-pretty in development for readable output
  if (pretty) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    };
  }

  return pino(options);
}

/**
 * Creates a child logger with additional context.
 *
 * @example
 * ```ts
 * const logger = createLogger({ service: 'api' });
 * const requestLogger = childLogger(logger, { requestId: 'abc-123' });
 * requestLogger.info('Processing request');
 * ```
 */
export function childLogger(
  logger: Logger,
  context: Record<string, unknown>
): Logger {
  return logger.child(context);
}

/**
 * Default logger instance for the application.
 * Can be used directly or as a base for child loggers.
 */
export const logger = createLogger();

/**
 * Pre-configured domain loggers for common use cases.
 */
export const loggers = {
  /** Logger for GTFS-related operations */
  gtfs: createLogger({ service: 'gtfs' }),
  /** Logger for authentication operations */
  auth: createLogger({ service: 'auth' }),
  /** Logger for background job processing */
  jobs: createLogger({ service: 'jobs' }),
  /** Logger for API requests */
  api: createLogger({ service: 'api' }),
  /** Logger for database operations */
  db: createLogger({ service: 'db' }),
  /** Logger for email operations */
  email: createLogger({ service: 'email' }),
};

/**
 * Type for structured error logging.
 */
export interface ErrorContext {
  err: Error;
  [key: string]: unknown;
}

/**
 * Helper to create error context for logging.
 *
 * @example
 * ```ts
 * logger.error(errorContext(error, { userId: '123' }), 'Failed to process');
 * ```
 */
export function errorContext(
  error: Error,
  additionalContext?: Record<string, unknown>
): ErrorContext {
  return {
    err: error,
    ...additionalContext,
  };
}

/**
 * Pino logger options for Fastify integration.
 * Use this when creating a Fastify instance.
 *
 * @example
 * ```ts
 * const app = Fastify({
 *   logger: getFastifyLoggerOptions({ service: 'api' }),
 * });
 * ```
 */
export function getFastifyLoggerOptions(
  config: LoggerConfig = {}
): LoggerOptions | boolean {
  const {
    level = (process.env['LOG_LEVEL'] as LogLevel) ?? 'info',
    service = 'api',
    pretty = isDevelopment(),
    context = {},
  } = config;

  const options: LoggerOptions = {
    level,
    base: {
      service,
      ...context,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    // Serialize common request properties
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        remoteAddress: req.ip,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  };

  if (pretty) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    };
  }

  return options;
}
