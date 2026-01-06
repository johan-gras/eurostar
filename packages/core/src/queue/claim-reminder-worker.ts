import { Worker, Job, Queue, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import { eq, and, gte } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { bookings, claims } from '../db/schema.js';
import {
  EMAIL_NOTIFICATION_QUEUE_NAME,
  type EmailNotificationJobData,
} from './email-notification-worker.js';

export const CLAIM_REMINDER_QUEUE_NAME = 'claim-reminder';

export interface ClaimReminderJobData {
  type: 'individual' | 'batch';
  claimId?: string; // For individual reminders
  triggeredAt: string;
}

export interface ClaimReminderJobResult {
  success: boolean;
  timestamp: Date;
  durationMs: number;
  claimsProcessed: number;
  remindersQueued: number;
  error?: string;
}

export interface ClaimReminderMetrics {
  timestamp: Date;
  durationMs: number;
  claimsProcessed: number;
  remindersQueued: number;
  errorMessage?: string;
}

// Reminder thresholds in days
const REMINDER_DAYS = [7, 3, 1]; // Send reminders at 7, 3, and 1 day(s) before expiry
const CLAIM_EXPIRY_DAYS = 30; // Claims expire after 30 days

/**
 * Creates a BullMQ Worker for claim reminder jobs.
 *
 * The worker:
 * 1. Finds eligible claims that haven't been submitted
 * 2. Determines if a reminder should be sent based on claim age
 * 3. Queues email notification jobs for reminders
 *
 * @param connection - Redis connection
 * @param db - Database connection
 * @param onMetrics - Callback for metrics logging
 */
export function createClaimReminderWorker(
  connection: Redis,
  db: Database,
  onMetrics?: (metrics: ClaimReminderMetrics) => void
): Worker<ClaimReminderJobData, ClaimReminderJobResult> {
  // Create email notification queue for queueing reminder emails
  const emailQueue = new Queue<EmailNotificationJobData>(
    EMAIL_NOTIFICATION_QUEUE_NAME,
    {
      connection: connection.duplicate() as ConnectionOptions,
    }
  );

  const worker = new Worker<ClaimReminderJobData, ClaimReminderJobResult>(
    CLAIM_REMINDER_QUEUE_NAME,
    async (job: Job<ClaimReminderJobData>) => {
      const startTime = Date.now();
      const { type, claimId } = job.data;
      const metrics: ClaimReminderMetrics = {
        timestamp: new Date(),
        durationMs: 0,
        claimsProcessed: 0,
        remindersQueued: 0,
      };

      try {
        if (type === 'individual' && claimId) {
          // Process single claim
          const result = await processIndividualClaim(
            db,
            emailQueue,
            claimId
          );
          metrics.claimsProcessed = 1;
          metrics.remindersQueued = result.reminderQueued ? 1 : 0;
        } else {
          // Batch process all eligible claims
          const result = await processBatchClaims(db, emailQueue);
          metrics.claimsProcessed = result.claimsProcessed;
          metrics.remindersQueued = result.remindersQueued;
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
          claimsProcessed: metrics.claimsProcessed,
          remindersQueued: metrics.remindersQueued,
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

        return {
          success: false,
          timestamp: metrics.timestamp,
          durationMs: metrics.durationMs,
          claimsProcessed: metrics.claimsProcessed,
          remindersQueued: metrics.remindersQueued,
          error: metrics.errorMessage,
        };
      }
    },
    {
      connection: connection as ConnectionOptions,
      concurrency: 1, // Process one batch at a time
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    }
  );

  // Handle worker errors
  worker.on('error', (error) => {
    console.error('[ClaimReminder Worker] Worker error:', error.message);
  });

  worker.on('failed', (job, error) => {
    console.error(
      `[ClaimReminder Worker] Job ${job?.id} failed:`,
      error.message
    );
  });

  // Cleanup on worker close
  worker.on('closed', () => {
    void emailQueue.close();
  });

  return worker;
}

async function processIndividualClaim(
  db: Database,
  emailQueue: Queue<EmailNotificationJobData>,
  claimId: string
): Promise<{ reminderQueued: boolean }> {
  const [claimWithBooking] = await db
    .select({
      claim: claims,
      booking: bookings,
    })
    .from(claims)
    .innerJoin(bookings, eq(claims.bookingId, bookings.id))
    .where(eq(claims.id, claimId))
    .limit(1);

  if (!claimWithBooking) {
    return { reminderQueued: false };
  }

  const { claim, booking } = claimWithBooking;

  // Only send reminders for eligible, unsubmitted claims
  if (claim.status !== 'eligible') {
    return { reminderQueued: false };
  }

  // Check if reminder should be sent based on claim age
  const shouldRemind = shouldSendReminder(claim.createdAt);

  if (shouldRemind) {
    await emailQueue.add(
      'claim-reminder',
      {
        type: 'claim_reminder',
        userId: booking.userId,
        bookingId: booking.id,
        claimId: claim.id,
        triggeredAt: new Date().toISOString(),
      },
      {
        jobId: `claim-reminder-${claim.id}-${Date.now()}`,
      }
    );
    return { reminderQueued: true };
  }

  return { reminderQueued: false };
}

async function processBatchClaims(
  db: Database,
  emailQueue: Queue<EmailNotificationJobData>
): Promise<{ claimsProcessed: number; remindersQueued: number }> {
  const now = new Date();
  const expiryDate = new Date(now);
  expiryDate.setDate(expiryDate.getDate() - CLAIM_EXPIRY_DAYS);

  // Find all eligible claims that haven't been submitted
  const eligibleClaims = await db
    .select({
      claim: claims,
      booking: bookings,
    })
    .from(claims)
    .innerJoin(bookings, eq(claims.bookingId, bookings.id))
    .where(
      and(
        eq(claims.status, 'eligible'),
        gte(claims.createdAt, expiryDate) // Not expired
      )
    );

  let remindersQueued = 0;

  for (const { claim, booking } of eligibleClaims) {
    const shouldRemind = shouldSendReminder(claim.createdAt);

    if (shouldRemind) {
      await emailQueue.add(
        'claim-reminder',
        {
          type: 'claim_reminder',
          userId: booking.userId,
          bookingId: booking.id,
          claimId: claim.id,
          triggeredAt: new Date().toISOString(),
        },
        {
          jobId: `claim-reminder-${claim.id}-${Date.now()}`,
        }
      );
      remindersQueued++;
    }
  }

  return {
    claimsProcessed: eligibleClaims.length,
    remindersQueued,
  };
}

/**
 * Determines if a reminder should be sent based on claim creation date.
 * Reminders are sent at specific intervals before expiry.
 */
function shouldSendReminder(createdAt: Date): boolean {
  const now = new Date();
  const claimAgeMs = now.getTime() - createdAt.getTime();
  const claimAgeDays = Math.floor(claimAgeMs / (1000 * 60 * 60 * 24));
  const daysUntilExpiry = CLAIM_EXPIRY_DAYS - claimAgeDays;

  // Check if we're at a reminder threshold
  return REMINDER_DAYS.includes(daysUntilExpiry);
}

function logMetrics(metrics: ClaimReminderMetrics, jobId?: string): void {
  const status = metrics.errorMessage ? 'ERROR' : 'OK';
  const parts = [
    `[ClaimReminder Worker]`,
    `status=${status}`,
    `job=${jobId ?? 'unknown'}`,
    `duration=${metrics.durationMs}ms`,
    `processed=${metrics.claimsProcessed}`,
    `reminders=${metrics.remindersQueued}`,
  ];

  if (metrics.errorMessage) {
    parts.push(`error="${metrics.errorMessage}"`);
  }

  console.log(parts.join(' '));
}
