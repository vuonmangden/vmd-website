import { Injectable, Logger } from '@nestjs/common';
import type { EmailProviderFactory } from './email-provider.factory';
import {
  EmailDeliveryError,
  type EmailDeliveryResult,
  type EmailMessage,
} from './email.types';

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  constructor(private readonly providerFactory: EmailProviderFactory) {}

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    try {
      const result = await this.providerFactory.create().send(message);
      this.logger.log({
        event: 'notification.email.sent',
        correlationId: message.correlationId,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        status: result.status,
      });
      return result;
    } catch (error) {
      const normalized = normalizeEmailError(error);
      this.logger.warn({
        event: 'notification.email.failed',
        correlationId: message.correlationId,
        provider: normalized.provider,
        retryable: normalized.retryable,
        code: normalized.code,
      });
      throw normalized;
    }
  }
}

function normalizeEmailError(error: unknown): EmailDeliveryError {
  if (error instanceof EmailDeliveryError) return error;
  return new EmailDeliveryError('provider_unavailable', true, null);
}
