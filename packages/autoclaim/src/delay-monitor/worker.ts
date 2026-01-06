import { Worker, Queue, Job, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Database } from '@eurostar/core/db';
import { createDelayMonitorService, type BookingCompletedHandler } from './service.js';

export const DELAY_MONITOR_QUEUE_NAME = 'delay-monitor';

/**
 * Default interval between delay monitor runs (5 minutes).
 */
const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;

export interface DelayMonitorJobData {
  triggeredAt: string;
}

export interface DelayMonitorJobResult {
  success: boolean;
  timestamp: Date;
  durationMs: number;
  processed: number;
  completed: number;
  skipped: number;
  inProgress: number;
  eligibleForClaim: number;
  error?: string;
}

export interface DelayMonitorMetrics {
  timestamp: Date;
  durationMs: number;
  processed: number;
  completed: number;
  skipped: number;
  inProgress: number;
  eligibleForClaim: number;
  errorMessage?: string;
}

/**
 * Creates a BullMQ Worker for delay monitoring jobs.
 *
 * The worker:
 * 1. Processes pending bookings (today/yesterday)
 * 2. Matches bookings to trains
 * 3. Updates final_delay_minutes for completed journeys
 * 4. Emits 'booking-completed' events for eligible claims
 *
 * @param connection - Redis connection
 * @param db - Database connection
 * @param onBookingCompleted - Callback when a booking journey completes
 * @param onMetrics - Callback for metrics logging
 */
export function createDelayMonitorWorker(
  connection: Redis,
  db: Database,
  onBookingCompleted?: BookingCompletedHandler,
  onMetrics?: (metrics: DelayMonitorMetrics) => void
): Worker<DelayMonitorJobData, DelayMonitorJobResult> {
  const service = onBookingCompleted
    ? createDelayMonitorService({ onBookingCompleted })
    : createDelayMonitorService();

  const worker = new Worker<DelayMonitorJobData, DelayMonitorJobResult>(
    DELAY_MONITOR_QUEUE_NAME,
    async (job: Job<DelayMonitorJobData>) => {
      const startTime = Date.now();
      const metrics: DelayMonitorMetrics = {
        timestamp: new Date(),
        durationMs: 0,
        processed: 0,
        completed: 0,
        skipped: 0,
        inProgress: 0,
        eligibleForClaim: 0,
      };

      try {
        // Process bookings
        const result = await service.processBookings(db);

        metrics.processed = result.processed;
        metrics.completed = result.completed.length;
        metrics.skipped = result.skipped;
        metrics.inProgress = result.inProgress;
        metrics.eligibleForClaim = result.completed.filter(
          (c) => c.delayMinutes >= 60
        ).length;
        metrics.durationMs = Date.now() - startTime;

        // Log errors if any
        if (result.errors.length > 0) {
          console.warn(
            `[Delay Monitor] Processing errors: ${result.errors.length}`,
            result.errors.slice(0, 3)
          );
        }

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
          processed: metrics.processed,
          completed: metrics.completed,
          skipped: metrics.skipped,
          inProgress: metrics.inProgress,
          eligibleForClaim: metrics.eligibleForClaim,
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
          processed: metrics.processed,
          completed: metrics.completed,
          skipped: metrics.skipped,
          inProgress: metrics.inProgress,
          eligibleForClaim: metrics.eligibleForClaim,
          error: metrics.errorMessage,
        };
      }
    },
    {
      connection: connection as ConnectionOptions,
      concurrency: 1, // Only one delay monitor job at a time
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    }
  );

  // Handle worker errors
  worker.on('error', (error: Error) => {
    console.error('[Delay Monitor] Worker error:', error.message);
  });

  worker.on('failed', (job: Job<DelayMonitorJobData> | undefined, error: Error) => {
    console.error(
      `[Delay Monitor] Job ${job?.id} failed:`,
      error.message
    );
  });

  return worker;
}

/**
 * Creates a BullMQ Queue for delay monitor jobs.
 */
export function createDelayMonitorQueue(
  connection: Redis
): Queue<DelayMonitorJobData, DelayMonitorJobResult> {
  return new Queue(DELAY_MONITOR_QUEUE_NAME, {
    connection: connection as ConnectionOptions,
    defaultJobOptions: {
      attempts: 1, // Don't retry - next scheduled job will run
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  });
}

export interface DelayMonitorSchedulerOptions {
  pollIntervalMs?: number;
}

/**
 * Scheduler for delay monitor jobs.
 * Runs delay monitoring every 5 minutes by default.
 */
export class DelayMonitorScheduler {
  private readonly queue: Queue<DelayMonitorJobData, DelayMonitorJobResult>;
  private readonly pollIntervalMs: number;
  private isRunning = false;

  constructor(
    connection: Redis,
    options: DelayMonitorSchedulerOptions = {}
  ) {
    this.queue = createDelayMonitorQueue(connection);
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  /**
   * Starts the scheduler by adding a repeating job.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // Remove any existing repeating jobs first
    await this.removeExistingJobs();

    // Add repeating job
    await this.queue.add(
      'delay-monitor-check',
      { triggeredAt: new Date().toISOString() },
      {
        repeat: {
          every: this.pollIntervalMs,
        },
        jobId: 'delay-monitor-repeating',
      }
    );

    this.isRunning = true;
    console.log(
      `[Delay Monitor Scheduler] Started with ${this.pollIntervalMs}ms interval`
    );
  }

  /**
   * Stops the scheduler by removing the repeating job.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.removeExistingJobs();
    this.isRunning = false;
    console.log('[Delay Monitor Scheduler] Stopped');
  }

  /**
   * Triggers an immediate delay check (in addition to scheduled ones).
   */
  async triggerNow(): Promise<void> {
    await this.queue.add(
      'delay-monitor-manual',
      { triggeredAt: new Date().toISOString() },
      {
        jobId: `delay-monitor-manual-${Date.now()}`,
      }
    );
    console.log('[Delay Monitor Scheduler] Manual check triggered');
  }

  /**
   * Closes the queue connection.
   */
  async close(): Promise<void> {
    await this.stop();
    await this.queue.close();
  }

  /**
   * Returns whether the scheduler is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Returns the underlying queue for advanced operations.
   */
  getQueue(): Queue<DelayMonitorJobData, DelayMonitorJobResult> {
    return this.queue;
  }

  private async removeExistingJobs(): Promise<void> {
    const repeatableJobs = await this.queue.getRepeatableJobs();

    for (const job of repeatableJobs) {
      await this.queue.removeRepeatableByKey(job.key);
    }
  }
}

/**
 * Creates and starts a delay monitor scheduler.
 */
export async function startDelayMonitorScheduler(
  connection: Redis,
  options: DelayMonitorSchedulerOptions = {}
): Promise<DelayMonitorScheduler> {
  const scheduler = new DelayMonitorScheduler(connection, options);
  await scheduler.start();
  return scheduler;
}

function logMetrics(metrics: DelayMonitorMetrics, jobId?: string): void {
  const status = metrics.errorMessage ? 'ERROR' : 'OK';
  const parts = [
    `[Delay Monitor]`,
    `status=${status}`,
    `job=${jobId ?? 'unknown'}`,
    `duration=${metrics.durationMs}ms`,
    `processed=${metrics.processed}`,
    `completed=${metrics.completed}`,
    `skipped=${metrics.skipped}`,
    `in_progress=${metrics.inProgress}`,
    `eligible=${metrics.eligibleForClaim}`,
  ];

  if (metrics.errorMessage) {
    parts.push(`error="${metrics.errorMessage}"`);
  }

  console.log(parts.join(' '));
}
