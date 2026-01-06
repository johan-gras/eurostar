/**
 * Types for the notification service.
 */

// Note: These types are self-contained to avoid tight coupling
// with the database schema, allowing flexibility in usage.

/**
 * Types of notifications that can be sent.
 */
export const NotificationType = {
  /** Claim has become eligible for submission */
  CLAIM_ELIGIBLE: 'claim_eligible',
  /** Reminder to submit claim */
  CLAIM_REMINDER: 'claim_reminder',
  /** Warning: deadline approaching (7 days) */
  DEADLINE_WARNING: 'deadline_warning',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/**
 * Base payload for all notifications.
 */
export interface BaseNotificationPayload {
  /** User to notify */
  userId: string;
  /** User's email address */
  email: string;
  /** User's first name (for personalization) */
  firstName: string;
}

/**
 * Payload for claim eligible notification.
 */
export interface ClaimEligiblePayload extends BaseNotificationPayload {
  type: typeof NotificationType.CLAIM_ELIGIBLE;
  /** Claim ID */
  claimId: string;
  /** Train number (e.g., "9007") */
  trainNumber: string;
  /** Origin station name */
  origin: string;
  /** Destination station name */
  destination: string;
  /** Journey date (ISO string) */
  journeyDate: string;
  /** Delay duration in minutes */
  delayMinutes: number;
  /** Eligible cash compensation amount */
  cashAmount: number;
  /** Eligible voucher compensation amount */
  voucherAmount: number;
  /** Currency (EUR or GBP) */
  currency: string;
  /** Pre-filled claim portal URL */
  claimUrl: string;
  /** Claim deadline (ISO string) */
  deadline: string;
}

/**
 * Payload for claim reminder notification.
 */
export interface ClaimReminderPayload extends BaseNotificationPayload {
  type: typeof NotificationType.CLAIM_REMINDER;
  /** Claim ID */
  claimId: string;
  /** Train number */
  trainNumber: string;
  /** Origin station name */
  origin: string;
  /** Destination station name */
  destination: string;
  /** Journey date (ISO string) */
  journeyDate: string;
  /** Eligible cash compensation amount */
  cashAmount: number;
  /** Currency */
  currency: string;
  /** Pre-filled claim portal URL */
  claimUrl: string;
  /** Claim deadline (ISO string) */
  deadline: string;
  /** Days until deadline */
  daysUntilDeadline: number;
}

/**
 * Payload for deadline warning notification.
 */
export interface DeadlineWarningPayload extends BaseNotificationPayload {
  type: typeof NotificationType.DEADLINE_WARNING;
  /** Claim ID */
  claimId: string;
  /** Train number */
  trainNumber: string;
  /** Origin station name */
  origin: string;
  /** Destination station name */
  destination: string;
  /** Journey date (ISO string) */
  journeyDate: string;
  /** Eligible cash compensation amount */
  cashAmount: number;
  /** Currency */
  currency: string;
  /** Pre-filled claim portal URL */
  claimUrl: string;
  /** Claim deadline (ISO string) */
  deadline: string;
  /** Days remaining until deadline */
  daysRemaining: number;
}

/**
 * Union type for all notification payloads.
 */
export type NotificationPayload =
  | ClaimEligiblePayload
  | ClaimReminderPayload
  | DeadlineWarningPayload;

/**
 * Result of sending a notification.
 */
export interface NotificationResult {
  /** Whether the notification was sent successfully */
  success: boolean;
  /** Notification type */
  type: NotificationType;
  /** Recipient email */
  email: string;
  /** Email provider message ID (if successful) */
  messageId?: string;
  /** Error message (if failed) */
  error?: string;
  /** Timestamp of send attempt */
  timestamp: Date;
}

/**
 * Notification job data for BullMQ queue.
 */
export interface NotificationJobData {
  /** Job type */
  type: NotificationType;
  /** Full notification payload */
  payload: NotificationPayload;
  /** Number of retry attempts */
  attempt?: number;
}

/**
 * Notification job result.
 */
export interface NotificationJobResult {
  /** Whether successful */
  success: boolean;
  /** Message ID from email provider */
  messageId?: string;
  /** Error message if failed */
  error?: string;
  /** Processing duration in ms */
  durationMs: number;
}

/**
 * Email template props (passed to React Email templates).
 */
export interface ClaimEligibleEmailProps {
  firstName: string;
  trainNumber: string;
  origin: string;
  destination: string;
  journeyDate: string;
  delayMinutes: number;
  cashAmount: number;
  voucherAmount: number;
  currency: string;
  claimUrl: string;
  deadline: string;
}

export interface DeadlineWarningEmailProps {
  firstName: string;
  trainNumber: string;
  origin: string;
  destination: string;
  journeyDate: string;
  cashAmount: number;
  currency: string;
  claimUrl: string;
  deadline: string;
  daysRemaining: number;
}

/**
 * Notification sending status for tracking.
 */
export const NotificationStatus = {
  /** Queued for sending */
  PENDING: 'pending',
  /** Successfully sent */
  SENT: 'sent',
  /** Send failed */
  FAILED: 'failed',
} as const;

export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

/**
 * Notification send options.
 */
export interface SendNotificationOptions {
  /** Skip queueing and send immediately */
  immediate?: boolean;
  /** Custom job ID for deduplication */
  jobId?: string;
}
