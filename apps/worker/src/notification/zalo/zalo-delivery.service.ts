import { Injectable, Logger } from '@nestjs/common';
import type { ZaloProviderFactory } from './zalo-provider.factory';
import {
  ZaloDeliveryError,
  type ZaloDeliveryResult,
  type ZaloMessage,
} from './zalo.types';

@Injectable()
export class ZaloDeliveryService {
  private readonly logger = new Logger(ZaloDeliveryService.name);

  constructor(private readonly providerFactory: ZaloProviderFactory) {}

  async send(message: ZaloMessage): Promise<ZaloDeliveryResult> {
    try {
      const result = await this.providerFactory.create().send(message);
      this.logger.log({
        event: 'notification.zalo.sent',
        correlationId: message.correlationId,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        status: result.status,
      });
      return result;
    } catch (error) {
      const normalized = normalizeZaloError(error);
      this.logger.warn({
        event: 'notification.zalo.failed',
        correlationId: message.correlationId,
        provider: normalized.provider,
        retryable: normalized.retryable,
        code: normalized.code,
      });
      throw normalized;
    }
  }
}

function normalizeZaloError(error: unknown): ZaloDeliveryError {
  if (error instanceof ZaloDeliveryError) return error;
  return new ZaloDeliveryError('provider_unavailable', true, null);
}
