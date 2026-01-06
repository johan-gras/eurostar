/**
 * Background Worker Entry Point
 *
 * Initializes and runs background workers for:
 * - GTFS-RT polling (train delay data)
 *
 * Usage: pnpm worker
 *
 * Environment variables:
 * - DATABASE_URL: PostgreSQL connection URL [REQUIRED]
 * - REDIS_URL: Redis connection URL [REQUIRED]
 * - JWT_SECRET: JWT signing secret [REQUIRED]
 * - RESEND_API_KEY: Resend API key [REQUIRED]
 * - GTFS_POLL_INTERVAL_MS: Polling interval in ms (default: 30000)
 */

import { createRedisConnection } from './queue/connection.js';
import { createGtfsWorker } from './queue/gtfs-worker.js';
import { GtfsScheduler } from './queue/gtfs-scheduler.js';
import { createDb } from './db/index.js';
import { validateEnv } from './config/env.js';
import type { Database } from './db/index.js';

interface WorkerConfig {
  redisUrl: string;
  databaseUrl: string;
  gtfsPollIntervalMs: number;
}

function loadConfig(): WorkerConfig {
  // Validate all required environment variables on startup
  const env = validateEnv();

  return {
    redisUrl: env.REDIS_URL,
    databaseUrl: env.DATABASE_URL,
    gtfsPollIntervalMs: parseInt(
      process.env['GTFS_POLL_INTERVAL_MS'] ?? '30000',
      10
    ),
  };
}

async function main(): Promise<void> {
  const config = loadConfig();

  console.log('━'.repeat(60));
  console.log('EUROSTAR BACKGROUND WORKER');
  console.log('━'.repeat(60));
  console.log(`Redis URL:     (configured)`);
  console.log(`Database URL:  (configured)`);
  console.log(`Poll interval: ${config.gtfsPollIntervalMs}ms`);
  console.log('━'.repeat(60));

  // Initialize Redis connection
  console.log('[Worker] Connecting to Redis...');
  const redis = createRedisConnection(config.redisUrl);

  // Initialize database connection
  console.log('[Worker] Connecting to database...');
  const db: Database = createDb(config.databaseUrl);

  // Create GTFS worker
  console.log('[Worker] Starting GTFS worker...');
  const gtfsWorker = createGtfsWorker(redis.duplicate(), db);

  // Create and start GTFS scheduler
  console.log('[Worker] Starting GTFS scheduler...');
  const gtfsScheduler = new GtfsScheduler(redis.duplicate(), {
    pollIntervalMs: config.gtfsPollIntervalMs,
  });
  await gtfsScheduler.start();

  // Trigger immediate poll on startup
  await gtfsScheduler.triggerNow();

  console.log('[Worker] All workers started successfully');
  console.log('[Worker] Press Ctrl+C to stop\n');

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[Worker] Received ${signal}, shutting down...`);

    try {
      // Stop scheduler first (no new jobs)
      await gtfsScheduler.close();
      console.log('[Worker] GTFS scheduler stopped');

      // Close worker (wait for current job to finish)
      await gtfsWorker.close();
      console.log('[Worker] GTFS worker stopped');

      // Close Redis connections
      await redis.quit();
      console.log('[Worker] Redis connection closed');

      console.log('[Worker] Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('[Worker] Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Keep process alive
  await new Promise(() => {});
}

main().catch((error) => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
