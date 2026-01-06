/**
 * Server entry point.
 *
 * Run with: pnpm dev
 * Build with: pnpm build && node dist/server.js
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env file before any other imports that might need env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import type { Worker } from 'bullmq';
import { createDb, type Database } from '@eurostar/core/db';
import {
  createGtfsWorker,
  createRedisConnection,
  GtfsScheduler,
  type GtfsJobData,
  type GtfsJobResult,
} from '@eurostar/core/queue';
import { createLogger, loggers } from '@eurostar/core/logging';
import { validateEnv } from '@eurostar/core/config';
import { createApp } from './api/app.js';

const log = createLogger({ service: 'server' });
import {
  createDelayMonitorWorker,
  DelayMonitorScheduler,
  type DelayMonitorJobData,
  type DelayMonitorJobResult,
} from './delay-monitor/worker.js';
import {
  createNotificationWorker,
  shutdownNotificationWorker,
} from './notifications/worker.js';
import { NotificationService } from './notifications/service.js';
import type { NotificationJobData, NotificationJobResult } from './notifications/types.js';

/**
 * Server configuration.
 */
interface ServerConfig {
  port: number;
  host: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  corsOrigin: string | undefined;
  gtfsPollIntervalMs: number;
  delayMonitorIntervalMs: number;
}

/**
 * Active workers and schedulers for graceful shutdown.
 */
interface ActiveServices {
  gtfsWorker?: Worker<GtfsJobData, GtfsJobResult>;
  gtfsScheduler?: GtfsScheduler;
  delayMonitorWorker?: Worker<DelayMonitorJobData, DelayMonitorJobResult>;
  delayMonitorScheduler?: DelayMonitorScheduler;
  notificationWorker?: Worker<NotificationJobData, NotificationJobResult>;
}

/**
 * Load and validate environment variables.
 * Validates all required vars on startup using centralized schema.
 */
function loadEnv(): ServerConfig {
  // Validate required environment variables first
  const validated = validateEnv();

  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  const host = process.env['HOST'] ?? '0.0.0.0';
  const corsOrigin = process.env['CORS_ORIGIN'];
  const gtfsPollIntervalMs = parseInt(process.env['GTFS_POLL_INTERVAL_MS'] ?? '30000', 10);
  const delayMonitorIntervalMs = parseInt(process.env['DELAY_MONITOR_INTERVAL_MS'] ?? '300000', 10);

  return {
    port,
    host,
    databaseUrl: validated.DATABASE_URL,
    redisUrl: validated.REDIS_URL,
    jwtSecret: validated.JWT_SECRET,
    corsOrigin,
    gtfsPollIntervalMs,
    delayMonitorIntervalMs,
  };
}

/**
 * Start background workers and schedulers.
 */
async function startWorkers(
  redis: Redis,
  db: Database,
  env: ServerConfig
): Promise<ActiveServices> {
  const services: ActiveServices = {};

  // Create notification service for delay monitor callbacks
  const notificationService = new NotificationService();
  notificationService.initializeQueue(redis);

  // GTFS Worker - polls GTFS-RT feed and syncs to database
  services.gtfsWorker = createGtfsWorker(redis, db);
  log.info('GTFS worker started');

  // GTFS Scheduler - triggers GTFS polling every 30s
  services.gtfsScheduler = new GtfsScheduler(redis, {
    pollIntervalMs: env.gtfsPollIntervalMs,
  });
  await services.gtfsScheduler.start();
  log.info({ intervalMs: env.gtfsPollIntervalMs }, 'GTFS scheduler started');

  // Delay Monitor Worker - checks bookings for completed journeys
  services.delayMonitorWorker = createDelayMonitorWorker(
    redis,
    db,
    async (event) => {
      // Log completed booking events for eligible claims
      // The notification service will handle queuing once we have the full booking data
      if (event.isEligibleForClaim) {
        loggers.jobs.info(
          { bookingId: event.bookingId, delayMinutes: event.delayMinutes },
          'Booking eligible for claim'
        );
      }
    }
  );
  log.info('Delay monitor worker started');

  // Delay Monitor Scheduler - triggers delay checks every 5 minutes
  services.delayMonitorScheduler = new DelayMonitorScheduler(redis, {
    pollIntervalMs: env.delayMonitorIntervalMs,
  });
  await services.delayMonitorScheduler.start();
  log.info({ intervalMs: env.delayMonitorIntervalMs }, 'Delay monitor scheduler started');

  // Notification Worker - sends emails
  services.notificationWorker = createNotificationWorker(redis);
  log.info('Notification worker started');

  return services;
}

/**
 * Stop all workers and schedulers gracefully.
 */
async function stopWorkers(services: ActiveServices): Promise<void> {
  const shutdownPromises: Promise<void>[] = [];

  // Stop schedulers first (no new jobs)
  if (services.gtfsScheduler) {
    shutdownPromises.push(
      services.gtfsScheduler.close().then(() => {
        log.info('GTFS scheduler stopped');
      })
    );
  }

  if (services.delayMonitorScheduler) {
    shutdownPromises.push(
      services.delayMonitorScheduler.close().then(() => {
        log.info('Delay monitor scheduler stopped');
      })
    );
  }

  // Wait for schedulers to stop
  await Promise.all(shutdownPromises);
  shutdownPromises.length = 0;

  // Then stop workers (finish active jobs)
  if (services.gtfsWorker) {
    shutdownPromises.push(
      services.gtfsWorker.close().then(() => {
        log.info('GTFS worker stopped');
      })
    );
  }

  if (services.delayMonitorWorker) {
    shutdownPromises.push(
      services.delayMonitorWorker.close().then(() => {
        log.info('Delay monitor worker stopped');
      })
    );
  }

  if (services.notificationWorker) {
    shutdownPromises.push(
      shutdownNotificationWorker(services.notificationWorker).then(() => {
        log.info('Notification worker stopped');
      })
    );
  }

  await Promise.all(shutdownPromises);
}

/**
 * Start the server.
 */
async function main(): Promise<void> {
  const env = loadEnv();

  // Create database connection
  const db = createDb(env.databaseUrl);
  log.info('Database connection initialized');

  // Create Redis connection (required for workers)
  // Uses createRedisConnection which sets maxRetriesPerRequest: null for BullMQ
  const redis = createRedisConnection(env.redisUrl);
  let services: ActiveServices = {};

  // Wait for Redis connection
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Redis connection timeout'));
    }, 10000);

    redis.once('ready', () => {
      clearTimeout(timeout);
      log.info('Redis connection ready');
      resolve();
    });

    redis.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  // Start background workers
  services = await startWorkers(redis, db, env);

  // Create app
  const app = await createApp({
    db,
    redis,
    auth: { secret: env.jwtSecret },
    cors: {
      origin: env.corsOrigin ?? true,
      credentials: true,
    },
  });

  // Graceful shutdown handler
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log('[Server] Shutdown already in progress...');
      return;
    }

    isShuttingDown = true;
    app.log.info(`Received ${signal}, shutting down gracefully...`);

    try {
      // Stop accepting new connections
      await app.close();
      app.log.info('Fastify closed');

      // Stop workers and schedulers
      await stopWorkers(services);
      app.log.info('Workers stopped');

      // Close Redis
      await redis.quit();
      app.log.info('Redis closed');

      app.log.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'Error during shutdown');
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    app.log.fatal(err, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (err) => {
    app.log.fatal(err, 'Unhandled rejection');
    process.exit(1);
  });

  // Start server
  try {
    await app.listen({ port: env.port, host: env.host });
    app.log.info(`Server listening on http://${env.host}:${env.port}`);

    // Log worker status
    app.log.info('Background workers active: GTFS poller, Delay monitor, Notifications');
  } catch (err) {
    app.log.fatal(err, 'Failed to start server');
    process.exit(1);
  }
}

// Run if this is the main module
main().catch((err) => {
  log.fatal({ err }, 'Fatal error');
  process.exit(1);
});
