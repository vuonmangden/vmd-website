import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationMessage,
  NotificationProvider,
  NotificationResult,
} from './notification-provider';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 10_000;

interface ResendSuccessBody {
  id: string;
}

interface ResendErrorBody {
  message?: string;
  name?: string;
}

/**
 * Resend adapter over the provider REST API (chosen in PRE-007).
 * Uses the runtime's native fetch so no vendor SDK is pulled in.
 */
@Injectable()
export class ResendEmailProvider implements NotificationProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  readonly name = 'resend';

  async send(message: NotificationMessage): Promise<NotificationResult> {
    const apiKey = process.env['RESEND_API_KEY'];
    const from = process.env['NOTIFICATION_FROM_EMAIL'];

    if (!apiKey || !from) {
      this.logger.error('Resend is not configured');
      return {
        success: false,
        provider: this.name,
        error: 'Email provider is not configured',
      };
    }

    const body: Record<string, unknown> = {
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    };

    if (message.replyTo) {
      body['reply_to'] = message.replyTo;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // Resend treats this header as an idempotency key, which keeps a retried
    // job from sending the same message twice (§22.4).
    if (message.deduplicationKey) {
      headers['Idempotency-Key'] = message.deduplicationKey;
    }

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as ResendErrorBody;
        const reason = error.message ?? `HTTP ${response.status}`;
        // Recipient address is deliberately omitted: §35.5 forbids logging
        // full email addresses.
        this.logger.error(`Resend rejected a message: ${reason}`);
        return { success: false, provider: this.name, error: reason };
      }

      const result = (await response.json()) as ResendSuccessBody;
      return {
        success: true,
        provider: this.name,
        providerMessageId: result.id,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Resend request failed: ${reason}`);
      return { success: false, provider: this.name, error: reason };
    }
  }
}
