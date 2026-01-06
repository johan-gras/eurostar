import type { Result } from '../result.js';
import type { EmailService, SendEmailResult, EmailError } from './types.js';
import {
  renderDelayDetected,
  renderClaimEligible,
  renderWeeklySummary,
  type DelayDetectedData,
  type ClaimEligibleData,
  type WeeklySummaryData,
} from './templates.js';

export class NotificationEmailService {
  constructor(private emailService: EmailService) {}

  async sendDelayDetected(
    to: string,
    data: DelayDetectedData
  ): Promise<Result<SendEmailResult, EmailError>> {
    const { html, text } = renderDelayDetected(data);

    return this.emailService.sendEmail({
      to,
      subject: `Delay Detected: Train ${data.trainNumber} on ${data.journeyDate}`,
      html,
      text,
      tags: [
        { name: 'type', value: 'delay_detected' },
        { name: 'train', value: data.trainNumber },
      ],
    });
  }

  async sendClaimEligible(
    to: string,
    data: ClaimEligibleData
  ): Promise<Result<SendEmailResult, EmailError>> {
    const { html, text } = renderClaimEligible(data);

    return this.emailService.sendEmail({
      to,
      subject: `Claim ${data.compensationAmount} Compensation for Train ${data.trainNumber}`,
      html,
      text,
      tags: [
        { name: 'type', value: 'claim_eligible' },
        { name: 'train', value: data.trainNumber },
      ],
    });
  }

  async sendWeeklySummary(
    to: string,
    data: WeeklySummaryData
  ): Promise<Result<SendEmailResult, EmailError>> {
    const { html, text } = renderWeeklySummary(data);

    return this.emailService.sendEmail({
      to,
      subject: `Your Eurostar Weekly Summary: ${data.weekStartDate} - ${data.weekEndDate}`,
      html,
      text,
      tags: [{ name: 'type', value: 'weekly_summary' }],
    });
  }
}
