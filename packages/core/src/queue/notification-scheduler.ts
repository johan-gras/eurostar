import { Queue, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import { eq, and, gte, lte, count } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { users, bookings, claims } from '../db/schema.js';
import {
  CLAIM_REMINDER_QUEUE_NAME,
  type ClaimReminderJobData,
} from './claim-reminder-worker.js';
import {
  DELAY_CHECK_QUEUE_NAME,
  type DelayCheckJobData,
} from './delay-check-worker.js';
import {
  EMAIL_NOTIFICATION_QUEUE_NAME,
  type EmailNotificationJobData,
} from './email-notification-worker.js';

export interface NotificationSchedulerOptions {
  dailyReminderHour?: number; // Hour in UTC (0-23), default 9
  weeklyReportDay?: number; // Day of week (0=Sunday, 1=Monday, etc), default 1 (Monday)
  weeklyReportHour?: number; // Hour in UTC (0-23), default 9
  delayCheckIntervalMs?: number; // Interval for delay checks, default 5 minutes
}

const DEFAULT_OPTIONS: Required<NotificationSchedulerOptions> = {
  dailyReminderHour: 9,
  weeklyReportDay: 1, // Monday
  weeklyReportHour: 9,
  delayCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
};

/**
 * Creates queues for all job types.
 */
export function createNotificationQueues(connection: Redis): {
  delayCheckQueue: Queue<DelayCheckJobData>;
  claimReminderQueue: Queue<ClaimReminderJobData>;
  emailNotificationQueue: Queue<EmailNotificationJobData>;
} {
  const delayCheckQueue = new Queue<DelayCheckJobData>(DELAY_CHECK_QUEUE_NAME, {
    connection: connection as ConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  });

  const claimReminderQueue = new Queue<ClaimReminderJobData>(
    CLAIM_REMINDER_QUEUE_NAME,
    {
      connection: connection.duplicate() as ConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
      },
    }
  );

  const emailNotificationQueue = new Queue<EmailNotificationJobData>(
    EMAIL_NOTIFICATION_QUEUE_NAME,
    {
      connection: connection.duplicate() as ConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 500 },
      },
    }
  );

  return { delayCheckQueue, claimReminderQueue, emailNotificationQueue };
}

/**
 * Notification Scheduler manages all scheduled jobs:
 * - Daily claim reminders
 * - Weekly summary reports
 * - Periodic delay checks
 */
export class NotificationScheduler {
  private readonly delayCheckQueue: Queue<DelayCheckJobData>;
  private readonly claimReminderQueue: Queue<ClaimReminderJobData>;
  private readonly emailNotificationQueue: Queue<EmailNotificationJobData>;
  private readonly options: Required<NotificationSchedulerOptions>;
  private readonly db: Database | undefined;
  private isRunning = false;

  constructor(
    connection: Redis,
    options: NotificationSchedulerOptions = {},
    db?: Database
  ) {
    const queues = createNotificationQueues(connection);
    this.delayCheckQueue = queues.delayCheckQueue;
    this.claimReminderQueue = queues.claimReminderQueue;
    this.emailNotificationQueue = queues.emailNotificationQueue;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.db = db;
  }

  /**
   * Starts all scheduled jobs.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // Remove existing repeatable jobs
    await this.removeExistingJobs();

    // Schedule delay checks (every 5 minutes)
    await this.delayCheckQueue.add(
      'delay-check-repeating',
      { triggeredAt: new Date().toISOString() },
      {
        repeat: {
          every: this.options.delayCheckIntervalMs,
        },
        jobId: 'delay-check-repeating',
      }
    );

    // Schedule daily claim reminders (daily at configured hour)
    await this.claimReminderQueue.add(
      'claim-reminder-daily',
      {
        type: 'batch',
        triggeredAt: new Date().toISOString(),
      },
      {
        repeat: {
          pattern: `0 ${this.options.dailyReminderHour} * * *`, // cron: every day at hour
        },
        jobId: 'claim-reminder-daily',
      }
    );

    // Schedule weekly summaries (weekly on configured day/hour)
    await this.emailNotificationQueue.add(
      'weekly-summary-batch',
      {
        type: 'weekly_summary',
        userId: '', // Will be replaced by batch processor
        triggeredAt: new Date().toISOString(),
        metadata: { batchJob: true },
      },
      {
        repeat: {
          pattern: `0 ${this.options.weeklyReportHour} * * ${this.options.weeklyReportDay}`,
        },
        jobId: 'weekly-summary-batch',
      }
    );

    this.isRunning = true;
    console.log('[Notification Scheduler] Started with schedules:');
    console.log(`  - Delay checks: every ${this.options.delayCheckIntervalMs}ms`);
    console.log(`  - Daily reminders: ${this.options.dailyReminderHour}:00 UTC`);
    console.log(
      `  - Weekly summaries: Day ${this.options.weeklyReportDay} at ${this.options.weeklyReportHour}:00 UTC`
    );
  }

  /**
   * Stops all scheduled jobs.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.removeExistingJobs();
    this.isRunning = false;
    console.log('[Notification Scheduler] Stopped');
  }

  /**
   * Triggers an immediate delay check.
   */
  async triggerDelayCheckNow(): Promise<void> {
    await this.delayCheckQueue.add(
      'delay-check-manual',
      { triggeredAt: new Date().toISOString() },
      {
        jobId: `delay-check-manual-${Date.now()}`,
      }
    );
    console.log('[Notification Scheduler] Manual delay check triggered');
  }

  /**
   * Triggers an immediate claim reminder batch.
   */
  async triggerClaimRemindersNow(): Promise<void> {
    await this.claimReminderQueue.add(
      'claim-reminder-manual',
      {
        type: 'batch',
        triggeredAt: new Date().toISOString(),
      },
      {
        jobId: `claim-reminder-manual-${Date.now()}`,
      }
    );
    console.log('[Notification Scheduler] Manual claim reminders triggered');
  }

  /**
   * Triggers daily summaries for all active users.
   * This queries the database and queues individual email jobs.
   */
  async triggerDailySummaries(): Promise<number> {
    if (!this.db) {
      console.warn('[Notification Scheduler] No database connection for daily summaries');
      return 0;
    }

    const activeUsers = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.emailVerified, true));

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    let queued = 0;
    for (const user of activeUsers) {
      // Get pending claims count
      const [pendingResult] = await this.db
        .select({ count: count() })
        .from(claims)
        .innerJoin(bookings, eq(claims.bookingId, bookings.id))
        .where(
          and(eq(bookings.userId, user.id), eq(claims.status, 'eligible'))
        );

      // Get upcoming journeys count
      const [upcomingResult] = await this.db
        .select({ count: count() })
        .from(bookings)
        .where(
          and(eq(bookings.userId, user.id), gte(bookings.journeyDate, now))
        );

      const pendingClaims = pendingResult?.count ?? 0;
      const upcomingJourneys = upcomingResult?.count ?? 0;

      // Only send if user has activity
      if (pendingClaims > 0 || upcomingJourneys > 0) {
        await this.emailNotificationQueue.add(
          'daily-summary',
          {
            type: 'daily_summary',
            userId: user.id,
            triggeredAt: new Date().toISOString(),
            metadata: { pendingClaims, upcomingJourneys },
          },
          {
            jobId: `daily-summary-${user.id}-${Date.now()}`,
          }
        );
        queued++;
      }
    }

    console.log(`[Notification Scheduler] Queued ${queued} daily summaries`);
    return queued;
  }

  /**
   * Triggers weekly summaries for all active users.
   */
  async triggerWeeklySummaries(): Promise<number> {
    if (!this.db) {
      console.warn('[Notification Scheduler] No database connection for weekly summaries');
      return 0;
    }

    const activeUsers = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.emailVerified, true));

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let queued = 0;
    for (const user of activeUsers) {
      // Get weekly stats
      const claimsInWeek = await this.db
        .select({
          delayMinutes: claims.delayMinutes,
          cashAmount: claims.eligibleCashAmount,
          status: claims.status,
        })
        .from(claims)
        .innerJoin(bookings, eq(claims.bookingId, bookings.id))
        .where(
          and(
            eq(bookings.userId, user.id),
            gte(claims.createdAt, weekAgo),
            lte(claims.createdAt, now)
          )
        );

      const totalDelays = claimsInWeek.length;
      const totalCompensation = claimsInWeek
        .reduce((sum, c) => sum + parseFloat(c.cashAmount ?? '0'), 0)
        .toFixed(2);
      const claimsSubmitted = claimsInWeek.filter(
        (c) => c.status === 'submitted' || c.status === 'approved'
      ).length;

      // Only send if user had activity this week
      if (totalDelays > 0) {
        await this.emailNotificationQueue.add(
          'weekly-summary',
          {
            type: 'weekly_summary',
            userId: user.id,
            triggeredAt: new Date().toISOString(),
            metadata: { totalDelays, totalCompensation, claimsSubmitted },
          },
          {
            jobId: `weekly-summary-${user.id}-${Date.now()}`,
          }
        );
        queued++;
      }
    }

    console.log(`[Notification Scheduler] Queued ${queued} weekly summaries`);
    return queued;
  }

  /**
   * Closes all queue connections.
   */
  async close(): Promise<void> {
    await this.stop();
    await Promise.all([
      this.delayCheckQueue.close(),
      this.claimReminderQueue.close(),
      this.emailNotificationQueue.close(),
    ]);
  }

  /**
   * Returns whether the scheduler is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Returns the underlying queues for advanced operations.
   */
  getQueues(): {
    delayCheckQueue: Queue<DelayCheckJobData>;
    claimReminderQueue: Queue<ClaimReminderJobData>;
    emailNotificationQueue: Queue<EmailNotificationJobData>;
  } {
    return {
      delayCheckQueue: this.delayCheckQueue,
      claimReminderQueue: this.claimReminderQueue,
      emailNotificationQueue: this.emailNotificationQueue,
    };
  }

  private async removeExistingJobs(): Promise<void> {
    const queues = [
      this.delayCheckQueue,
      this.claimReminderQueue,
      this.emailNotificationQueue,
    ];

    for (const queue of queues) {
      const repeatableJobs = await queue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await queue.removeRepeatableByKey(job.key);
      }
    }
  }
}

/**
 * Creates and starts a notification scheduler.
 *
 * @param connection - Redis connection
 * @param options - Scheduler options
 * @param db - Database connection (optional, needed for summary emails)
 * @returns Started scheduler instance
 */
export async function startNotificationScheduler(
  connection: Redis,
  options: NotificationSchedulerOptions = {},
  db?: Database
): Promise<NotificationScheduler> {
  const scheduler = new NotificationScheduler(connection, options, db);
  await scheduler.start();
  return scheduler;
}
