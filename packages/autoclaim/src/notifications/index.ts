// Notifications module - email notifications for claims

// Types
export {
  NotificationType,
  NotificationStatus,
  type NotificationPayload,
  type ClaimEligiblePayload,
  type ClaimReminderPayload,
  type DeadlineWarningPayload,
  type NotificationResult,
  type NotificationJobData,
  type NotificationJobResult,
  type ClaimEligibleEmailProps,
  type DeadlineWarningEmailProps,
  type BaseNotificationPayload,
  type SendNotificationOptions,
} from './types.js';

// Email service
export {
  type EmailService,
  type Email,
  type SendEmailResult,
  MockEmailService,
  ResendEmailService,
  type ResendEmailServiceOptions,
  createEmailService,
  renderNotificationEmail,
} from './email-service.js';

// Notification service
export {
  NotificationService,
  createNotificationService,
  type NotificationServiceOptions,
  type ClaimNotificationData,
  type ClaimData,
  NOTIFICATION_QUEUE_NAME,
} from './service.js';

// Worker
export {
  createNotificationWorker,
  shutdownNotificationWorker,
  type NotificationWorkerOptions,
  type NotificationWorkerMetrics,
} from './worker.js';

// Templates
export { ClaimEligibleEmail } from './templates/claim-eligible.js';
export { DeadlineWarningEmail } from './templates/deadline-warning.js';
