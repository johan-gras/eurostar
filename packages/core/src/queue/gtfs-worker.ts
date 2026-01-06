import { Worker, Job, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import { fetchGtfsRealtimeWithRetry } from '../gtfs/client.js';
import { extractDelays, filterSignificantDelays } from '../gtfs/parser.js';
import { syncTrainsToDbBatch } from '../gtfs/sync.js';
import type { Database } from '../db/index.js';
import { loggers } from '../logging/logger.js';

const log = loggers.gtfs;

export const GTFS_QUEUE_NAME = 'gtfs-polling';

export interface GtfsJobData {
  triggeredAt: string;
}

export interface GtfsJobResult {
  success: boolean;
  timestamp: Date;
  durationMs: number;
  entityCount: number;
  delayCount: number;
  significantDelayCount: number;
  syncedCount: number;
  error?: string;
}

export interface GtfsPollMetrics {
  timestamp: Date;
  durationMs: number;
  entityCount: number;
  delayCount: number;
  significantDelayCount: number;
  syncedCount: number;
  errorMessage?: string;
}

/**
 * Creates a BullMQ Worker for GTFS-RT polling jobs.
 *
 * The worker:
 * 1. Fetches GTFS-RT data from Eurostar
 * 2. Parses train delays
 * 3. Syncs to database
 * 4. Logs metrics
 *
 * @param connection - Redis connection
 * @param db - Database connection (optional, skips sync if not provided)
 * @param onMetrics - Callback for metrics logging
 */
export function createGtfsWorker(
  connection: Redis,
  db?: Database,
  onMetrics?: (metrics: GtfsPollMetrics) => void
): Worker<GtfsJobData, GtfsJobResult> {
  const worker = new Worker<GtfsJobData, GtfsJobResult>(
    GTFS_QUEUE_NAME,
    async (job: Job<GtfsJobData>) => {
      const startTime = Date.now();
      const metrics: GtfsPollMetrics = {
        timestamp: new Date(),
        durationMs: 0,
        entityCount: 0,
        delayCount: 0,
        significantDelayCount: 0,
        syncedCount: 0,
      };

      try {
        // Fetch GTFS-RT data
        const result = await fetchGtfsRealtimeWithRetry();

        if (result.isErr()) {
          throw new Error(`GTFS fetch failed: ${result.error.message}`);
        }

        const feed = result.value;
        metrics.entityCount = feed.entity.length;

        // Parse delays
        const delays = extractDelays(feed);
        metrics.delayCount = delays.length;

        // Count significant delays
        const significantDelays = filterSignificantDelays(delays);
        metrics.significantDelayCount = significantDelays.length;

        // Sync to database if connection provided
        if (db) {
          const syncResult = await syncTrainsToDbBatch(delays, db);
          metrics.syncedCount = syncResult.inserted;

          if (syncResult.errors.length > 0) {
            log.warn(
              { errorCount: syncResult.errors.length, errors: syncResult.errors.slice(0, 3) },
              'Sync errors encountered'
            );
          }
        }

        metrics.durationMs = Date.now() - startTime;

        // Log metrics
        if (onMetrics) {
          onMetrics(metrics);
        } else {
          logMetrics(metrics, job.id);
        }

        return {
          success: true,
          timestamp: metrics.timestamp,
          durationMs: metrics.durationMs,
          entityCount: metrics.entityCount,
          delayCount: metrics.delayCount,
          significantDelayCount: metrics.significantDelayCount,
          syncedCount: metrics.syncedCount,
        };
      } catch (error) {
        metrics.durationMs = Date.now() - startTime;
        metrics.errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Log error metrics
        if (onMetrics) {
          onMetrics(metrics);
        } else {
          logMetrics(metrics, job.id);
        }

        // Return error result instead of throwing to avoid job retry storms
        return {
          success: false,
          timestamp: metrics.timestamp,
          durationMs: metrics.durationMs,
          entityCount: metrics.entityCount,
          delayCount: metrics.delayCount,
          significantDelayCount: metrics.significantDelayCount,
          syncedCount: metrics.syncedCount,
          error: metrics.errorMessage,
        };
      }
    },
    {
      connection: connection as ConnectionOptions,
      concurrency: 1, // Only one GTFS poll at a time
      removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
      removeOnFail: { count: 100 }, // Keep last 100 failed jobs
    }
  );

  // Handle worker errors
  worker.on('error', (error) => {
    log.error({ err: error }, 'Worker error');
  });

  worker.on('failed', (job, error) => {
    log.error({ err: error, jobId: job?.id }, 'Job failed');
  });

  return worker;
}

function logMetrics(metrics: GtfsPollMetrics, jobId?: string): void {
  const logContext = {
    jobId: jobId ?? 'unknown',
    durationMs: metrics.durationMs,
    entityCount: metrics.entityCount,
    delayCount: metrics.delayCount,
    significantDelayCount: metrics.significantDelayCount,
    syncedCount: metrics.syncedCount,
  };

  if (metrics.errorMessage) {
    log.error({ ...logContext, error: metrics.errorMessage }, 'GTFS poll failed');
  } else {
    log.info(logContext, 'GTFS poll completed');
  }
}
