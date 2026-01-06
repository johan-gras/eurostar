/**
 * BullMQ worker for processing notification jobs.
 *
 * Processes queued notification jobs with automatic retries and
 * error handling for reliable email delivery.
 */

import { Worker, Job, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import {
  type NotificationJobData,
  type NotificationJobResult,
} from './types.js';
import {
  type EmailService,
  createEmailService,
} from './email-service.js';
import { NOTIFICATION_QUEUE_NAME } from './service.js';

/**
 * Metrics for notification worker processing.
 */
export interface NotificationWorkerMetrics {
  timestamp: Date;
  jobId: string;
  type: string;
  success: boolean;
  durationMs: number;
  attempt: number;
  email: string;
  messageId?: string;
  error?: string;
}

/**
 * Options for creating the notification worker.
 */
export interface NotificationWorkerOptions {
  /** Email service instance (defaults to auto-created based on env) */
  emailService?: EmailService;
  /** Callback for logging metrics */
  onMetrics?: (metrics: NotificationWorkerMetrics) => void;
  /** Worker concurrency (default: 5) */
  concurrency?: number;
}

/**
 * Creates a BullMQ worker for processing notification jobs.
 *
 * The worker:
 * 1. Dequeues notification jobs
 * 2. Renders email templates
 * 3. Sends via configured email service
 * 4. Handles retries on failure (3 attempts with exponential backoff)
 *
 * @param connection - Redis connection
 * @param options - Worker options
 */
export function createNotificationWorker(
  connection: Redis,
  options: NotificationWorkerOptions = {}
): Worker<NotificationJobData, NotificationJobResult> {
  const emailService = options.emailService ?? createEmailService();
  const onMetrics = options.onMetrics ?? logMetrics;
  const concurrency = options.concurrency ?? 5;

  const worker = new Worker<NotificationJobData, NotificationJobResult>(
    NOTIFICATION_QUEUE_NAME,
    async (job: Job<NotificationJobData>) => {
      const startTime = Date.now();
      const { type, payload, attempt = 0 } = job.data;

      const metrics: NotificationWorkerMetrics = {
        timestamp: new Date(),
        jobId: job.id ?? 'unknown',
        type,
        success: false,
        durationMs: 0,
        attempt: attempt + 1,
        email: payload.email,
      };

      try {
        // Send the notification
        const result = await emailService.sendNotification(payload);

        metrics.durationMs = Date.now() - startTime;
        metrics.success = result.success;

        if (result.messageId !== undefined) {
          metrics.messageId = result.messageId;
        }

        if (!result.success) {
          if (result.error !== undefined) {
            metrics.error = result.error;
          }

          // Log metrics
          onMetrics(metrics);

          // Throw to trigger retry
          throw new Error(result.error ?? 'Email send failed');
        }

        // Log success metrics
        onMetrics(metrics);

        const jobResult: NotificationJobResult = {
          success: true,
          durationMs: metrics.durationMs,
        };

        if (result.messageId !== undefined) {
          jobResult.messageId = result.messageId;
        }

        return jobResult;
      } catch (error) {
        metrics.durationMs = Date.now() - startTime;
        metrics.error = error instanceof Error ? error.message : 'Unknown error';

        // Log error metrics
        onMetrics(metrics);

        // Re-throw to trigger BullMQ retry
        throw error;
      }
    },
    {
      connection: connection as ConnectionOptions,
      concurrency,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    }
  );

  // Handle worker-level errors
  worker.on('error', (error: Error) => {
    console.error('[NotificationWorker] Worker error:', error.message);
  });

  worker.on('failed', (job: Job<NotificationJobData> | undefined, error: Error) => {
    const maxAttempts = 3;
    const attemptsMade = job?.attemptsMade ?? 0;

    if (attemptsMade >= maxAttempts) {
      console.error(
        `[NotificationWorker] Job ${job?.id} permanently failed after ${attemptsMade} attempts:`,
        error.message
      );
    } else {
      console.warn(
        `[NotificationWorker] Job ${job?.id} failed (attempt ${attemptsMade}/${maxAttempts}):`,
        error.message
      );
    }
  });

  worker.on('completed', (job: Job<NotificationJobData>) => {
    console.log(
      `[NotificationWorker] Job ${job.id} completed - ${job.data.type} to ${job.data.payload.email}`
    );
  });

  return worker;
}

/**
 * Default metrics logger.
 */
function logMetrics(metrics: NotificationWorkerMetrics): void {
  const status = metrics.success ? 'OK' : 'FAIL';
  const parts = [
    `[NotificationWorker]`,
    `status=${status}`,
    `job=${metrics.jobId}`,
    `type=${metrics.type}`,
    `email=${metrics.email}`,
    `attempt=${metrics.attempt}`,
    `duration=${metrics.durationMs}ms`,
  ];

  if (metrics.messageId) {
    parts.push(`messageId=${metrics.messageId}`);
  }

  if (metrics.error) {
    parts.push(`error="${metrics.error}"`);
  }

  console.log(parts.join(' '));
}

/**
 * Gracefully shuts down a notification worker.
 *
 * @param worker - The worker to shut down
 */
export async function shutdownNotificationWorker(
  worker: Worker<NotificationJobData, NotificationJobResult>
): Promise<void> {
  console.log('[NotificationWorker] Initiating graceful shutdown...');

  // Close the worker, waiting for active jobs to complete
  await worker.close();

  console.log('[NotificationWorker] Shutdown complete');
}
