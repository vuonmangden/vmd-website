import {
  EmailDeliveryError,
  type EmailDeliveryResult,
  type EmailMessage,
  type EmailProvider,
} from './email.types';
import type { EmailConfiguration } from './email.configuration';

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly configuration: EmailConfiguration,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    try {
      validateMessage(message);
      const response = await this.fetchImplementation(
        `${this.configuration.resendApiUrl}/emails`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.configuration.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${this.configuration.fromName} <${this.configuration.fromAddress}>`,
            to: [message.recipient],
            reply_to: this.configuration.replyTo,
            subject: message.subject,
            text: message.text,
            ...(message.html ? { html: message.html } : {}),
          }),
          signal: AbortSignal.timeout(this.configuration.timeoutMs),
        },
      );

      if (response.ok) {
        return {
          provider: 'resend',
          providerMessageId: await readMessageId(response),
          status: 'sent',
        };
      }

      throw responseError(response.status);
    } catch (error) {
      if (error instanceof EmailDeliveryError) throw error;
      if (isTimeout(error)) {
        throw new EmailDeliveryError('timeout', true, 'resend');
      }

      throw new EmailDeliveryError('provider_unavailable', true, 'resend');
    }
  }
}

async function readMessageId(response: Response): Promise<string | null> {
  try {
    const payload: unknown = await response.json();
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'id' in payload &&
      typeof payload.id === 'string'
    ) {
      return payload.id;
    }
  } catch {
    return null;
  }

  return null;
}

function responseError(status: number): EmailDeliveryError {
  if (status === 401 || status === 403) {
    return new EmailDeliveryError('authentication', false, 'resend');
  }

  if (status === 429) {
    return new EmailDeliveryError('rate_limited', true, 'resend');
  }

  if (status >= 500) {
    return new EmailDeliveryError('provider_unavailable', true, 'resend');
  }

  return new EmailDeliveryError('rejected', false, 'resend');
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}

function validateMessage(message: EmailMessage): void {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
  if (!emailPattern.test(message.recipient) || !message.subject.trim()) {
    throw new EmailDeliveryError('rejected', false, 'resend');
  }
}
