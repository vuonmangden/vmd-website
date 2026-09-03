import { ZaloDeliveryService } from './zalo-delivery.service';
import { ZaloDeliveryError, type ZaloProvider } from './zalo.types';
import type { ZaloProviderFactory } from './zalo-provider.factory';

describe('ZaloDeliveryService', () => {
  it('preserves the retryable classification for NTF-004 queue handling', async () => {
    const provider: ZaloProvider = {
      send: jest
        .fn()
        .mockRejectedValue(new ZaloDeliveryError('rate_limited', true, 'mock')),
    };
    const service = new ZaloDeliveryService({ create: () => provider } as ZaloProviderFactory);

    await expect(
      service.send({
        correlationId: 'correlation-123',
        idempotencyKey: 'notification:correlation-123:zalo',
        recipientPhone: '0987654321',
        templateCode: 'BOOKING_CONFIRMED_ZALO',
        templateParams: {},
      }),
    ).rejects.toMatchObject({
      code: 'rate_limited',
      retryable: true,
    } satisfies Partial<ZaloDeliveryError>);
  });

  it('classifies a disabled adapter as non-retryable so callers fall back to email', async () => {
    const factory = {
      create: () => {
        throw new ZaloDeliveryError('disabled', false, null);
      },
    } as ZaloProviderFactory;
    const service = new ZaloDeliveryService(factory);

    await expect(
      service.send({
        correlationId: 'correlation-456',
        idempotencyKey: 'notification:correlation-456:zalo',
        recipientPhone: '0987654321',
        templateCode: 'BOOKING_CONFIRMED_ZALO',
        templateParams: {},
      }),
    ).rejects.toMatchObject({
      code: 'disabled',
      retryable: false,
    } satisfies Partial<ZaloDeliveryError>);
  });
});
