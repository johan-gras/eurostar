import { ok, type Result } from '../result.js';
import type {
  EmailService,
  SendEmailOptions,
  SendEmailResult,
  EmailError,
} from './types.js';

export interface SentEmail extends SendEmailOptions {
  id: string;
  sentAt: Date;
}

export class MockEmailService implements EmailService {
  private sentEmails: SentEmail[] = [];
  private idCounter = 0;

  async sendEmail(
    options: SendEmailOptions
  ): Promise<Result<SendEmailResult, EmailError>> {
    const id = `mock_${++this.idCounter}`;

    this.sentEmails.push({
      ...options,
      id,
      sentAt: new Date(),
    });

    return ok({ id });
  }

  getSentEmails(): SentEmail[] {
    return [...this.sentEmails];
  }

  getLastEmail(): SentEmail | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  findEmailsByRecipient(email: string): SentEmail[] {
    return this.sentEmails.filter((sent) => {
      const recipients = Array.isArray(sent.to) ? sent.to : [sent.to];
      return recipients.some((r) =>
        typeof r === 'string' ? r === email : r.email === email
      );
    });
  }

  findEmailsBySubject(subject: string): SentEmail[] {
    return this.sentEmails.filter((sent) =>
      sent.subject.toLowerCase().includes(subject.toLowerCase())
    );
  }

  clear(): void {
    this.sentEmails = [];
    this.idCounter = 0;
  }
}
