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
            'Idempotency-Key': message.idempotencyKey,
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

      throw await responseError(response);
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

async function responseError(response: Response): Promise<EmailDeliveryError> {
  const status = response.status;
  if (status === 401 || status === 403) {
    return new EmailDeliveryError('authentication', false, 'resend');
  }

  if (status === 429) {
    return new EmailDeliveryError('rate_limited', true, 'resend');
  }

  // Resend returns this 409 while another request with the same
  // Idempotency-Key is still in flight. Retrying the exact same request is
  // explicitly safe; other 409 responses (for a key/payload mismatch) are
  // terminal and must not be retried with a changed payload.
  if (status === 409) {
    const code = await readErrorCode(response);
    return new EmailDeliveryError(
      code === 'concurrent_idempotent_requests'
        ? 'provider_unavailable'
        : 'rejected',
      code === 'concurrent_idempotent_requests',
      'resend',
    );
  }

  if (status >= 500) {
    return new EmailDeliveryError('provider_unavailable', true, 'resend');
  }

  return new EmailDeliveryError('rejected', false, 'resend');
}

async function readErrorCode(response: Response): Promise<string | null> {
  try {
    const payload: unknown = await response.json();
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'name' in payload &&
      typeof payload.name === 'string'
    ) {
      return payload.name;
    }
  } catch {
    // Provider bodies are intentionally not surfaced in user-facing errors
    // or logs. Unknown 409 is handled safely as non-retryable.
  }
  return null;
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
