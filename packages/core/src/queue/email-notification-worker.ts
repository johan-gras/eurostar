import { Worker, Job, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { users, bookings, claims } from '../db/schema.js';
import type { Result } from '../result.js';

export const EMAIL_NOTIFICATION_QUEUE_NAME = 'email-notification';

export type EmailNotificationType =
  | 'delay_detected'
  | 'claim_eligible'
  | 'claim_reminder'
  | 'daily_summary'
  | 'weekly_summary';

export interface EmailNotificationJobData {
  type: EmailNotificationType;
  userId: string;
  bookingId?: string;
  claimId?: string;
  metadata?: Record<string, unknown>;
  triggeredAt: string;
}

export interface EmailNotificationJobResult {
  success: boolean;
  timestamp: Date;
  durationMs: number;
  emailType: EmailNotificationType;
  recipientEmail: string | undefined;
  error: string | undefined;
}

export interface EmailNotificationMetrics {
  timestamp: Date;
  durationMs: number;
  emailType: EmailNotificationType;
  recipientEmail?: string;
  errorMessage?: string;
}

export interface EmailSender {
  send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<Result<void, Error>>;
}

/**
 * Creates a BullMQ Worker for email notification jobs.
 *
 * The worker:
 * 1. Fetches user and related data
 * 2. Generates email content based on notification type
 * 3. Sends email via configured sender
 *
 * @param connection - Redis connection
 * @param db - Database connection
 * @param emailSender - Email sending service
 * @param onMetrics - Callback for metrics logging
 */
export function createEmailNotificationWorker(
  connection: Redis,
  db: Database,
  emailSender: EmailSender,
  onMetrics?: (metrics: EmailNotificationMetrics) => void
): Worker<EmailNotificationJobData, EmailNotificationJobResult> {
  const worker = new Worker<EmailNotificationJobData, EmailNotificationJobResult>(
    EMAIL_NOTIFICATION_QUEUE_NAME,
    async (job: Job<EmailNotificationJobData>) => {
      const startTime = Date.now();
      const { type, userId, bookingId, claimId, metadata } = job.data;
      const metrics: EmailNotificationMetrics = {
        timestamp: new Date(),
        durationMs: 0,
        emailType: type,
      };

      try {
        // Fetch user
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user) {
          throw new Error(`User not found: ${userId}`);
        }

        metrics.recipientEmail = user.email;

        // Fetch booking if provided
        let booking = null;
        if (bookingId) {
          const [b] = await db
            .select()
            .from(bookings)
            .where(eq(bookings.id, bookingId))
            .limit(1);
          booking = b ?? null;
        }

        // Fetch claim if provided
        let claim = null;
        if (claimId) {
          const [c] = await db
            .select()
            .from(claims)
            .where(eq(claims.id, claimId))
            .limit(1);
          claim = c ?? null;
        }

        // Generate email content
        const emailContent = generateEmailContent(type, {
          user,
          booking,
          claim,
          metadata,
        });

        // Send email
        const sendResult = await emailSender.send({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        if (sendResult.isErr()) {
          throw sendResult.error;
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
          emailType: type,
          recipientEmail: user.email,
          error: undefined,
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
          emailType: type,
          recipientEmail: metrics.recipientEmail,
          error: metrics.errorMessage,
        };
      }
    },
    {
      connection: connection as ConnectionOptions,
      concurrency: 5, // Can send multiple emails in parallel
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 500 },
    }
  );

  // Handle worker errors
  worker.on('error', (error) => {
    console.error('[EmailNotification Worker] Worker error:', error.message);
  });

  worker.on('failed', (job, error) => {
    console.error(
      `[EmailNotification Worker] Job ${job?.id} failed:`,
      error.message
    );
  });

  return worker;
}

interface EmailContext {
  user: { email: string; id: string };
  booking: {
    pnr: string;
    trainNumber: string;
    journeyDate: Date;
    origin: string;
    destination: string;
    finalDelayMinutes: number | null;
  } | null | undefined;
  claim: {
    delayMinutes: number;
    eligibleCashAmount: string | null;
    eligibleVoucherAmount: string | null;
    status: string;
  } | null | undefined;
  metadata: Record<string, unknown> | undefined;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function generateEmailContent(
  type: EmailNotificationType,
  context: EmailContext
): EmailContent {
  switch (type) {
    case 'delay_detected':
      return generateDelayDetectedEmail(context);
    case 'claim_eligible':
      return generateClaimEligibleEmail(context);
    case 'claim_reminder':
      return generateClaimReminderEmail(context);
    case 'daily_summary':
      return generateDailySummaryEmail(context);
    case 'weekly_summary':
      return generateWeeklySummaryEmail(context);
    default:
      throw new Error(`Unknown email type: ${type as string}`);
  }
}

function generateDelayDetectedEmail(context: EmailContext): EmailContent {
  const { booking } = context;
  const delay = booking?.finalDelayMinutes ?? 0;
  const trainNumber = booking?.trainNumber ?? 'Unknown';

  return {
    subject: `Delay detected on your Eurostar ${trainNumber}`,
    html: `
      <h1>Delay Detected</h1>
      <p>Your Eurostar train ${trainNumber} was delayed by ${delay} minutes.</p>
      <p>We're monitoring this for potential compensation eligibility.</p>
    `,
    text: `Delay Detected\n\nYour Eurostar train ${trainNumber} was delayed by ${delay} minutes.\nWe're monitoring this for potential compensation eligibility.`,
  };
}

function generateClaimEligibleEmail(context: EmailContext): EmailContent {
  const { booking, claim } = context;
  const trainNumber = booking?.trainNumber ?? 'Unknown';
  const cashAmount = claim?.eligibleCashAmount ?? '0';
  const voucherAmount = claim?.eligibleVoucherAmount ?? '0';

  return {
    subject: `You're eligible for compensation - Eurostar ${trainNumber}`,
    html: `
      <h1>Compensation Available</h1>
      <p>Good news! Your delayed Eurostar journey is eligible for compensation.</p>
      <ul>
        <li>Cash compensation: £${cashAmount}</li>
        <li>Voucher compensation: £${voucherAmount}</li>
      </ul>
      <p>Log in to your dashboard to submit your claim.</p>
    `,
    text: `Compensation Available\n\nGood news! Your delayed Eurostar journey is eligible for compensation.\n\nCash compensation: £${cashAmount}\nVoucher compensation: £${voucherAmount}\n\nLog in to your dashboard to submit your claim.`,
  };
}

function generateClaimReminderEmail(context: EmailContext): EmailContent {
  const { booking } = context;
  const trainNumber = booking?.trainNumber ?? 'Unknown';

  return {
    subject: `Reminder: Submit your Eurostar compensation claim`,
    html: `
      <h1>Claim Reminder</h1>
      <p>Don't forget! You have an eligible compensation claim for Eurostar ${trainNumber} that hasn't been submitted yet.</p>
      <p>Log in to your dashboard to submit your claim before the deadline.</p>
    `,
    text: `Claim Reminder\n\nDon't forget! You have an eligible compensation claim for Eurostar ${trainNumber} that hasn't been submitted yet.\n\nLog in to your dashboard to submit your claim before the deadline.`,
  };
}

function generateDailySummaryEmail(context: EmailContext): EmailContent {
  const { metadata } = context;
  const pendingClaims = (metadata?.['pendingClaims'] as number) ?? 0;
  const upcomingJourneys = (metadata?.['upcomingJourneys'] as number) ?? 0;

  return {
    subject: `Your Daily Eurostar Summary`,
    html: `
      <h1>Daily Summary</h1>
      <ul>
        <li>Pending claims: ${pendingClaims}</li>
        <li>Upcoming journeys: ${upcomingJourneys}</li>
      </ul>
      <p>Visit your dashboard for more details.</p>
    `,
    text: `Daily Summary\n\nPending claims: ${pendingClaims}\nUpcoming journeys: ${upcomingJourneys}\n\nVisit your dashboard for more details.`,
  };
}

function generateWeeklySummaryEmail(context: EmailContext): EmailContent {
  const { metadata } = context;
  const totalDelays = (metadata?.['totalDelays'] as number) ?? 0;
  const totalCompensation = (metadata?.['totalCompensation'] as string) ?? '0';
  const claimsSubmitted = (metadata?.['claimsSubmitted'] as number) ?? 0;

  return {
    subject: `Your Weekly Eurostar Summary`,
    html: `
      <h1>Weekly Summary</h1>
      <ul>
        <li>Total delays detected: ${totalDelays}</li>
        <li>Total compensation available: £${totalCompensation}</li>
        <li>Claims submitted: ${claimsSubmitted}</li>
      </ul>
      <p>Visit your dashboard for full details.</p>
    `,
    text: `Weekly Summary\n\nTotal delays detected: ${totalDelays}\nTotal compensation available: £${totalCompensation}\nClaims submitted: ${claimsSubmitted}\n\nVisit your dashboard for full details.`,
  };
}

function logMetrics(metrics: EmailNotificationMetrics, jobId?: string): void {
  const status = metrics.errorMessage ? 'ERROR' : 'OK';
  const parts = [
    `[EmailNotification Worker]`,
    `status=${status}`,
    `job=${jobId ?? 'unknown'}`,
    `type=${metrics.emailType}`,
    `duration=${metrics.durationMs}ms`,
  ];

  if (metrics.recipientEmail) {
    parts.push(`to=${metrics.recipientEmail}`);
  }

  if (metrics.errorMessage) {
    parts.push(`error="${metrics.errorMessage}"`);
  }

  console.log(parts.join(' '));
}
