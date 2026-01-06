/**
 * Email service implementations for sending notification emails.
 *
 * Provides both a mock service for development/testing and a real
 * Resend-based service for production.
 */

import { Resend } from 'resend';
import { render } from '@react-email/components';
import { ClaimEligibleEmail } from './templates/claim-eligible.js';
import { DeadlineWarningEmail } from './templates/deadline-warning.js';
import {
  NotificationType,
  type NotificationPayload,
  type ClaimEligiblePayload,
  type DeadlineWarningPayload,
  type ClaimEligibleEmailProps,
  type DeadlineWarningEmailProps,
} from './types.js';

/**
 * Result of sending an email.
 */
export interface SendEmailResult {
  /** Whether the send was successful */
  success: boolean;
  /** Message ID from the email provider */
  messageId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Email to send.
 */
export interface Email {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML content */
  html: string;
  /** Plain text fallback */
  text?: string;
}

/**
 * Interface for email service implementations.
 * Allows easy swapping between mock and real implementations.
 */
export interface EmailService {
  /**
   * Send an email.
   * @param email - The email to send
   * @returns Result of the send operation
   */
  send(email: Email): Promise<SendEmailResult>;

  /**
   * Send a notification email using a template.
   * @param payload - The notification payload
   * @returns Result of the send operation
   */
  sendNotification(payload: NotificationPayload): Promise<SendEmailResult>;
}

/**
 * Renders a notification payload to HTML email content.
 */
export async function renderNotificationEmail(
  payload: NotificationPayload
): Promise<{ subject: string; html: string }> {
  switch (payload.type) {
    case NotificationType.CLAIM_ELIGIBLE: {
      const props = payloadToClaimEligibleProps(payload);
      const formatCurrency = (amount: number, currency: string) =>
        currency === 'GBP' ? `£${amount.toFixed(2)}` : `€${amount.toFixed(2)}`;

      return {
        subject: `You're eligible for ${formatCurrency(props.cashAmount, props.currency)} Eurostar compensation`,
        html: await render(ClaimEligibleEmail(props)),
      };
    }

    case NotificationType.CLAIM_REMINDER: {
      // Claim reminder uses the same template as claim eligible for now
      const reminderPayload = payload;
      const props: ClaimEligibleEmailProps = {
        firstName: reminderPayload.firstName,
        trainNumber: reminderPayload.trainNumber,
        origin: reminderPayload.origin,
        destination: reminderPayload.destination,
        journeyDate: reminderPayload.journeyDate,
        delayMinutes: 60, // Minimum for eligibility
        cashAmount: reminderPayload.cashAmount,
        voucherAmount: reminderPayload.cashAmount * 1.5, // Approximate voucher amount
        currency: reminderPayload.currency,
        claimUrl: reminderPayload.claimUrl,
        deadline: reminderPayload.deadline,
      };
      const formatCurrency = (amount: number, currency: string) =>
        currency === 'GBP' ? `£${amount.toFixed(2)}` : `€${amount.toFixed(2)}`;

      return {
        subject: `Reminder: Claim your ${formatCurrency(props.cashAmount, props.currency)} Eurostar compensation`,
        html: await render(ClaimEligibleEmail(props)),
      };
    }

    case NotificationType.DEADLINE_WARNING: {
      const props = payloadToDeadlineWarningProps(payload);
      const formatCurrency = (amount: number, currency: string) =>
        currency === 'GBP' ? `£${amount.toFixed(2)}` : `€${amount.toFixed(2)}`;

      return {
        subject: `Only ${props.daysRemaining} days left to claim ${formatCurrency(props.cashAmount, props.currency)} compensation`,
        html: await render(DeadlineWarningEmail(props)),
      };
    }

    default: {
      const _exhaustive: never = payload;
      throw new Error(`Unknown notification type: ${(_exhaustive as NotificationPayload).type}`);
    }
  }
}

function payloadToClaimEligibleProps(
  payload: ClaimEligiblePayload
): ClaimEligibleEmailProps {
  return {
    firstName: payload.firstName,
    trainNumber: payload.trainNumber,
    origin: payload.origin,
    destination: payload.destination,
    journeyDate: payload.journeyDate,
    delayMinutes: payload.delayMinutes,
    cashAmount: payload.cashAmount,
    voucherAmount: payload.voucherAmount,
    currency: payload.currency,
    claimUrl: payload.claimUrl,
    deadline: payload.deadline,
  };
}

function payloadToDeadlineWarningProps(
  payload: DeadlineWarningPayload
): DeadlineWarningEmailProps {
  return {
    firstName: payload.firstName,
    trainNumber: payload.trainNumber,
    origin: payload.origin,
    destination: payload.destination,
    journeyDate: payload.journeyDate,
    cashAmount: payload.cashAmount,
    currency: payload.currency,
    claimUrl: payload.claimUrl,
    deadline: payload.deadline,
    daysRemaining: payload.daysRemaining,
  };
}

/**
 * Mock email service that logs emails to console.
 * Use this for development and testing.
 */
export class MockEmailService implements EmailService {
  private readonly sentEmails: Array<{ email: Email; timestamp: Date }> = [];

  async send(email: Email): Promise<SendEmailResult> {
    const timestamp = new Date();
    this.sentEmails.push({ email, timestamp });

    console.log('[MockEmailService] Email sent:');
    console.log(`  To: ${email.to}`);
    console.log(`  Subject: ${email.subject}`);
    console.log(`  Time: ${timestamp.toISOString()}`);
    console.log(`  HTML length: ${email.html.length} chars`);
    console.log('---');

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  }

  async sendNotification(payload: NotificationPayload): Promise<SendEmailResult> {
    const { subject, html } = await renderNotificationEmail(payload);

    return this.send({
      to: payload.email,
      subject,
      html,
    });
  }

  /**
   * Get all sent emails (useful for testing).
   */
  getSentEmails(): Array<{ email: Email; timestamp: Date }> {
    return [...this.sentEmails];
  }

  /**
   * Get the last sent email.
   */
  getLastEmail(): { email: Email; timestamp: Date } | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  /**
   * Clear sent emails history.
   */
  clearHistory(): void {
    this.sentEmails.length = 0;
  }
}

/**
 * Options for creating the Resend email service.
 */
export interface ResendEmailServiceOptions {
  /** Resend API key (defaults to RESEND_API_KEY env var) */
  apiKey?: string;
  /** From email address */
  from: string;
  /** Reply-to email address (optional) */
  replyTo?: string;
}

/**
 * Production email service using Resend.
 * Requires RESEND_API_KEY environment variable or apiKey option.
 */
export class ResendEmailService implements EmailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly replyTo?: string;

  constructor(options: ResendEmailServiceOptions) {
    const apiKey = options.apiKey ?? process.env['RESEND_API_KEY'];

    if (!apiKey) {
      throw new Error(
        'Resend API key is required. Set RESEND_API_KEY environment variable or pass apiKey option.'
      );
    }

    this.resend = new Resend(apiKey);
    this.from = options.from;
    if (options.replyTo !== undefined) {
      this.replyTo = options.replyTo;
    }
  }

  async send(email: Email): Promise<SendEmailResult> {
    try {
      const emailOptions: Parameters<typeof this.resend.emails.send>[0] = {
        from: this.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
      };

      // Only add optional fields if they are defined
      if (email.text !== undefined) {
        emailOptions.text = email.text;
      }
      if (this.replyTo !== undefined) {
        emailOptions.replyTo = this.replyTo;
      }

      const result = await this.resend.emails.send(emailOptions);

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
        };
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendNotification(payload: NotificationPayload): Promise<SendEmailResult> {
    const { subject, html } = await renderNotificationEmail(payload);

    return this.send({
      to: payload.email,
      subject,
      html,
    });
  }
}

/**
 * Creates an email service based on environment.
 * Uses ResendEmailService in production (when RESEND_API_KEY is set),
 * otherwise falls back to MockEmailService.
 */
export function createEmailService(
  options?: Partial<ResendEmailServiceOptions>
): EmailService {
  const apiKey = options?.apiKey ?? process.env['RESEND_API_KEY'];

  if (apiKey) {
    const serviceOptions: ResendEmailServiceOptions = {
      apiKey,
      from: options?.from ?? 'Eurostar Tools <notifications@eurostar.tools>',
    };

    // Only add replyTo if defined
    if (options?.replyTo !== undefined) {
      serviceOptions.replyTo = options.replyTo;
    }

    return new ResendEmailService(serviceOptions);
  }

  console.warn(
    '[EmailService] No RESEND_API_KEY found, using MockEmailService. ' +
      'Set RESEND_API_KEY for production email delivery.'
  );

  return new MockEmailService();
}
