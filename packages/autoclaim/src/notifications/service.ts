/**
 * Notification service for managing claim-related notifications.
 *
 * Orchestrates notification sending through BullMQ for reliable delivery
 * with automatic retries and tracking.
 */

import { Queue, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import { generateClaimPortalUrl, getStationDisplayName } from '../claim-generator/form-data.js';
import { getClaimDeadline, daysUntilDeadline } from '../eligibility/deadline.js';
import {
  NotificationType,
  type NotificationPayload,
  type ClaimEligiblePayload,
  type DeadlineWarningPayload,
  type NotificationJobData,
  type NotificationResult,
  type SendNotificationOptions,
} from './types.js';
import {
  type EmailService,
  createEmailService,
} from './email-service.js';

export const NOTIFICATION_QUEUE_NAME = 'notifications';

/**
 * Options for creating the notification service.
 */
export interface NotificationServiceOptions {
  /** Email service instance (defaults to auto-created based on env) */
  emailService?: EmailService;
  /** Custom from email address */
  fromEmail?: string;
}

/**
 * Claim data needed for notifications (simplified from database model).
 */
export interface ClaimData {
  id: string;
  delayMinutes: number;
  /** Cash compensation amount */
  cashAmount: number;
  /** Voucher compensation amount */
  voucherAmount: number;
  /** Currency (EUR or GBP) */
  currency: string;
}

/**
 * Information needed to build a notification for a claim.
 */
export interface ClaimNotificationData {
  claim: ClaimData;
  user: {
    id: string;
    email: string;
    firstName: string;
  };
  booking: {
    trainNumber: string;
    origin: string;
    destination: string;
    journeyDate: Date;
    pnr: string;
    tcn: string;
  };
}

/**
 * Notification service for sending claim-related emails.
 *
 * Features:
 * - Queues notifications via BullMQ for reliable delivery
 * - Supports immediate send mode for testing
 * - Builds notification payloads from claim/user data
 * - Tracks notification send status
 */
export class NotificationService {
  private readonly emailService: EmailService;
  private queue: Queue<NotificationJobData> | null = null;

  constructor(options: NotificationServiceOptions = {}) {
    this.emailService = options.emailService ?? createEmailService(
      options.fromEmail !== undefined ? { from: options.fromEmail } : undefined
    );
  }

  /**
   * Initialize the service with a Redis connection for queuing.
   * Must be called before using queue-based methods.
   */
  initializeQueue(connection: Redis): void {
    this.queue = new Queue<NotificationJobData>(NOTIFICATION_QUEUE_NAME, {
      connection: connection as ConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      },
    });
  }

  /**
   * Send a claim eligible notification.
   *
   * Notifies the user that their delayed journey is eligible for compensation
   * and provides a pre-filled claim link.
   *
   * @param data - Claim, user, and booking information
   * @param options - Send options
   */
  async sendClaimEligibleNotification(
    data: ClaimNotificationData,
    options: SendNotificationOptions = {}
  ): Promise<NotificationResult> {
    const payload = this.buildClaimEligiblePayload(data);
    return this.sendNotification(payload, options);
  }

  /**
   * Send a deadline warning notification.
   *
   * Reminds the user that their claim deadline is approaching (typically 7 days).
   *
   * @param data - Claim, user, and booking information
   * @param options - Send options
   */
  async sendDeadlineWarning(
    data: ClaimNotificationData,
    options: SendNotificationOptions = {}
  ): Promise<NotificationResult> {
    const daysRemaining = daysUntilDeadline(data.booking.journeyDate);

    if (daysRemaining === null || daysRemaining < 0) {
      return {
        success: false,
        type: NotificationType.DEADLINE_WARNING,
        email: data.user.email,
        error: 'Claim deadline has already passed',
        timestamp: new Date(),
      };
    }

    const payload = this.buildDeadlineWarningPayload(data, daysRemaining);
    return this.sendNotification(payload, options);
  }

  /**
   * Send a notification (queued or immediate).
   *
   * @param payload - The notification payload
   * @param options - Send options
   */
  async sendNotification(
    payload: NotificationPayload,
    options: SendNotificationOptions = {}
  ): Promise<NotificationResult> {
    const timestamp = new Date();

    // Immediate mode: send directly without queuing
    if (options.immediate) {
      return this.sendImmediate(payload, timestamp);
    }

    // Queue mode: add to BullMQ for reliable delivery
    if (!this.queue) {
      // Fallback to immediate if queue not initialized
      console.warn(
        '[NotificationService] Queue not initialized, sending immediately. ' +
          'Call initializeQueue() for reliable delivery.'
      );
      return this.sendImmediate(payload, timestamp);
    }

    return this.sendQueued(payload, options, timestamp);
  }

  /**
   * Send notification immediately without queuing.
   */
  private async sendImmediate(
    payload: NotificationPayload,
    timestamp: Date
  ): Promise<NotificationResult> {
    try {
      const result = await this.emailService.sendNotification(payload);

      const notificationResult: NotificationResult = {
        success: result.success,
        type: payload.type,
        email: payload.email,
        timestamp,
      };

      if (result.messageId !== undefined) {
        notificationResult.messageId = result.messageId;
      }
      if (result.error !== undefined) {
        notificationResult.error = result.error;
      }

      return notificationResult;
    } catch (error) {
      return {
        success: false,
        type: payload.type,
        email: payload.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
      };
    }
  }

  /**
   * Queue notification for reliable delivery.
   */
  private async sendQueued(
    payload: NotificationPayload,
    options: SendNotificationOptions,
    timestamp: Date
  ): Promise<NotificationResult> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    try {
      const jobData: NotificationJobData = {
        type: payload.type,
        payload,
        attempt: 0,
      };

      const jobId =
        options.jobId ??
        `${payload.type}-${payload.userId}-${Date.now()}`;

      await this.queue.add(payload.type, jobData, {
        jobId,
        // Deduplicate by job ID
        deduplication: {
          id: jobId,
        },
      });

      return {
        success: true,
        type: payload.type,
        email: payload.email,
        messageId: jobId, // Return job ID as message ID for tracking
        timestamp,
      };
    } catch (error) {
      // If queueing fails, try immediate send as fallback
      console.error(
        '[NotificationService] Failed to queue notification, trying immediate:',
        error
      );
      return this.sendImmediate(payload, timestamp);
    }
  }

  /**
   * Build payload for claim eligible notification.
   */
  private buildClaimEligiblePayload(data: ClaimNotificationData): ClaimEligiblePayload {
    const { claim, user, booking } = data;
    const deadline = getClaimDeadline(booking.journeyDate);
    const claimUrl = generateClaimPortalUrl();

    return {
      type: NotificationType.CLAIM_ELIGIBLE,
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      claimId: claim.id,
      trainNumber: booking.trainNumber,
      origin: getStationDisplayName(booking.origin),
      destination: getStationDisplayName(booking.destination),
      journeyDate: this.formatDate(booking.journeyDate),
      delayMinutes: claim.delayMinutes,
      cashAmount: claim.cashAmount,
      voucherAmount: claim.voucherAmount,
      currency: claim.currency,
      claimUrl,
      deadline: this.formatDate(deadline),
    };
  }

  /**
   * Build payload for deadline warning notification.
   */
  private buildDeadlineWarningPayload(
    data: ClaimNotificationData,
    daysRemaining: number
  ): DeadlineWarningPayload {
    const { claim, user, booking } = data;
    const deadline = getClaimDeadline(booking.journeyDate);
    const claimUrl = generateClaimPortalUrl();

    return {
      type: NotificationType.DEADLINE_WARNING,
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      claimId: claim.id,
      trainNumber: booking.trainNumber,
      origin: getStationDisplayName(booking.origin),
      destination: getStationDisplayName(booking.destination),
      journeyDate: this.formatDate(booking.journeyDate),
      cashAmount: claim.cashAmount,
      currency: claim.currency,
      claimUrl,
      deadline: this.formatDate(deadline),
      daysRemaining,
    };
  }

  /**
   * Format a date for display in emails.
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Close the notification queue connection.
   */
  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }

  /**
   * Get the underlying queue (for testing/monitoring).
   */
  getQueue(): Queue<NotificationJobData> | null {
    return this.queue;
  }
}

/**
 * Creates a new NotificationService instance.
 */
export function createNotificationService(
  options: NotificationServiceOptions = {}
): NotificationService {
  return new NotificationService(options);
}
