import { type Result } from '../result.js';

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: string | EmailAddress | (string | EmailAddress)[];
  subject: string;
  html: string;
  text?: string;
  from?: string | EmailAddress;
  replyTo?: string | EmailAddress;
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  id: string;
}

export type EmailError =
  | 'invalid_api_key'
  | 'rate_limited'
  | 'invalid_recipient'
  | 'send_failed'
  | 'template_error'
  | 'timeout';

export interface EmailService {
  sendEmail(options: SendEmailOptions): Promise<Result<SendEmailResult, EmailError>>;
}
