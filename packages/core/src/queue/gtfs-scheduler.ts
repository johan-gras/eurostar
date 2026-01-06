import { Queue, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import { GTFS_QUEUE_NAME, type GtfsJobData, type GtfsJobResult } from './gtfs-worker.js';

const DEFAULT_POLL_INTERVAL_MS = 30_000; // 30 seconds

export interface GtfsSchedulerOptions {
  pollIntervalMs?: number;
}

/**
 * Creates a BullMQ Queue for GTFS polling jobs.
 */
export function createGtfsQueue(
  connection: Redis
): Queue<GtfsJobData, GtfsJobResult> {
  return new Queue(GTFS_QUEUE_NAME, {
    connection: connection as ConnectionOptions,
    defaultJobOptions: {
      attempts: 1, // Don't retry - next scheduled job will run
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  });
}

/**
 * GTFS Scheduler manages the repeating poll job.
 */
export class GtfsScheduler {
  private readonly queue: Queue<GtfsJobData, GtfsJobResult>;
  private readonly pollIntervalMs: number;
  private isRunning = false;

  constructor(
    connection: Redis,
    options: GtfsSchedulerOptions = {}
  ) {
    this.queue = createGtfsQueue(connection);
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
      'gtfs-poll',
      { triggeredAt: new Date().toISOString() },
      {
        repeat: {
          every: this.pollIntervalMs,
        },
        jobId: 'gtfs-poll-repeating',
      }
    );

    this.isRunning = true;
    console.log(
      `[GTFS Scheduler] Started with ${this.pollIntervalMs}ms interval`
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
    console.log('[GTFS Scheduler] Stopped');
  }

  /**
   * Triggers an immediate poll job (in addition to scheduled ones).
   */
  async triggerNow(): Promise<void> {
    await this.queue.add(
      'gtfs-poll-manual',
      { triggeredAt: new Date().toISOString() },
      {
        jobId: `gtfs-poll-manual-${Date.now()}`,
      }
    );
    console.log('[GTFS Scheduler] Manual poll triggered');
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
  getQueue(): Queue<GtfsJobData, GtfsJobResult> {
    return this.queue;
  }

  private async removeExistingJobs(): Promise<void> {
    // Get all repeatable jobs and remove them
    const repeatableJobs = await this.queue.getRepeatableJobs();

    for (const job of repeatableJobs) {
      await this.queue.removeRepeatableByKey(job.key);
    }
  }
}

/**
 * Creates and starts a GTFS scheduler.
 *
 * @param connection - Redis connection
 * @param options - Scheduler options
 * @returns Started scheduler instance
 */
export async function startGtfsScheduler(
  connection: Redis,
  options: GtfsSchedulerOptions = {}
): Promise<GtfsScheduler> {
  const scheduler = new GtfsScheduler(connection, options);
  await scheduler.start();
  return scheduler;
}
