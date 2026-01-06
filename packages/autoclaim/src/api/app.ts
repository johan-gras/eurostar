/**
 * Fastify application factory.
 */

import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import type { Database } from '@eurostar/core/db';
import { getFastifyLoggerOptions, type LoggerConfig } from '@eurostar/core/logging';
import type { Redis } from 'ioredis';
import { EligibilityService } from '../eligibility/index.js';
import { ClaimGeneratorService } from '../claim-generator/index.js';
import { registerAuth, type AuthOptions, type JwtPayload } from './middleware/auth.js';
import { registerErrorHandler, registerNotFoundHandler } from './middleware/error-handler.js';
import { registerSanitization } from './middleware/sanitize.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerBookingRoutes } from './routes/bookings.js';
import { registerClaimsRoutes } from './routes/claims.js';
import { registerSeatRoutes } from './handlers/seats.handler.js';
import { registerQueueRoutes } from './handlers/queue.handler.js';
import { registerAuthRoutes } from './handlers/auth.handler.js';
import { registerPreferencesRoutes } from './handlers/preferences.handler.js';

/**
 * Services that can be injected into the app.
 */
export interface AppServices {
  eligibilityService?: EligibilityService;
  claimService?: ClaimGeneratorService;
}

/**
 * App creation options.
 */
export interface CreateAppOptions {
  /** Database connection (required for full functionality) */
  db?: Database | undefined;
  /** Redis connection (optional, for readiness check) */
  redis?: Redis | undefined;
  /** Services to inject */
  services?: AppServices | undefined;
  /** Auth configuration */
  auth?: AuthOptions | undefined;
  /** Fastify options */
  fastifyOptions?: FastifyServerOptions | undefined;
  /** CORS options */
  cors?: {
    origin?: string | string[] | boolean;
    credentials?: boolean;
  } | undefined;
  /** Logger configuration */
  loggerConfig?: LoggerConfig | undefined;
}

/**
 * Creates a configured Fastify application.
 */
export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const {
    db,
    redis,
    services = {},
    auth = {},
    fastifyOptions = {},
    cors: corsOptions = {},
    loggerConfig = {},
  } = options;

  // Create Fastify instance with structured logging and request size limits
  const app = Fastify({
    logger: fastifyOptions.logger ?? getFastifyLoggerOptions(loggerConfig),
    // Request body size limits for security
    bodyLimit: 1024 * 1024, // 1MB max body size
    ...fastifyOptions,
  });

  // Add content type parser with size limit for JSON
  app.addContentTypeParser('application/json', { parseAs: 'string', bodyLimit: 1024 * 1024 }, (_req, body, done) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Register CORS
  await app.register(cors, {
    origin: corsOptions.origin ?? true,
    credentials: corsOptions.credentials ?? true,
  });

  // Register global rate limiting: 100 requests per minute per IP
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });

  // Register error handlers
  registerErrorHandler(app);
  registerNotFoundHandler(app);

  // Register input sanitization
  registerSanitization(app);

  // Register auth
  await registerAuth(app, auth);

  // Create services
  const eligibilityService = services.eligibilityService ?? new EligibilityService();
  const claimService = services.claimService ?? new ClaimGeneratorService();

  // Register health routes (no auth required)
  registerHealthRoutes(app, { db, redis });

  // Register seat routes (no auth required, no db required)
  registerSeatRoutes(app);

  // Register queue routes (no auth required, no db required)
  registerQueueRoutes(app);

  // Register auth routes (require db and redis)
  if (db && redis) {
    registerAuthRoutes(app, { db, redis });
  }

  // Register API routes (require db)
  if (db) {
    registerBookingRoutes(app, {
      db,
      eligibilityService,
    });

    registerClaimsRoutes(app, {
      db,
      claimService,
    });

    registerPreferencesRoutes(app, { db });
  }

  return app;
}

/**
 * Creates a minimal app for testing without database.
 */
export async function createTestApp(options: {
  mockUser?: JwtPayload;
  db?: Database;
  services?: AppServices;
} = {}): Promise<FastifyInstance> {
  return createApp({
    db: options.db,
    services: options.services,
    auth: {
      skipAuth: true,
      mockUser: options.mockUser ?? {
        userId: 'test-user-id',
        email: 'test@example.com',
      },
    },
    fastifyOptions: {
      logger: false,
    },
  });
}

export { ApiException } from './middleware/error-handler.js';
export { createTestToken, type JwtPayload } from './middleware/auth.js';
