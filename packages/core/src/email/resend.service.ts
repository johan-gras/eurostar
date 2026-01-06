import { Resend } from 'resend';
import { ok, err, type Result } from '../result.js';
import type {
  EmailService,
  SendEmailOptions,
  SendEmailResult,
  EmailError,
  EmailAddress,
} from './types.js';

const DEFAULT_FROM = 'Eurostar Tools <notifications@eurostar-tools.com>';
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(ms)), ms)
    ),
  ]);
}

function formatAddress(addr: string | EmailAddress): string {
  if (typeof addr === 'string') {
    return addr;
  }
  return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
}

function formatRecipients(
  to: string | EmailAddress | (string | EmailAddress)[]
): string[] {
  if (Array.isArray(to)) {
    return to.map(formatAddress);
  }
  return [formatAddress(to)];
}

export class ResendEmailService implements EmailService {
  private client: Resend;
  private timeoutMs: number;

  constructor(apiKey: string, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.client = new Resend(apiKey);
    this.timeoutMs = timeoutMs;
  }

  async sendEmail(
    options: SendEmailOptions
  ): Promise<Result<SendEmailResult, EmailError>> {
    try {
      const emailPayload: Parameters<typeof this.client.emails.send>[0] = {
        from: options.from ? formatAddress(options.from) : DEFAULT_FROM,
        to: formatRecipients(options.to),
        subject: options.subject,
        html: options.html,
      };

      if (options.text) {
        emailPayload.text = options.text;
      }
      if (options.replyTo) {
        emailPayload.replyTo = formatAddress(options.replyTo);
      }
      if (options.tags) {
        emailPayload.tags = options.tags;
      }

      const { data, error } = await withTimeout(
        this.client.emails.send(emailPayload),
        this.timeoutMs
      );

      if (error) {
        if (error.message.includes('API key')) {
          return err('invalid_api_key');
        }
        if (error.message.includes('rate')) {
          return err('rate_limited');
        }
        if (error.message.includes('recipient') || error.message.includes('email')) {
          return err('invalid_recipient');
        }
        return err('send_failed');
      }

      if (!data?.id) {
        return err('send_failed');
      }

      return ok({ id: data.id });
    } catch (error) {
      if (error instanceof TimeoutError) {
        return err('timeout');
      }
      return err('send_failed');
    }
  }
}
