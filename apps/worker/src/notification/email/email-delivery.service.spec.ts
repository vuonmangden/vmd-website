import { EmailDeliveryService } from './email-delivery.service';
import { EmailDeliveryError, type EmailProvider } from './email.types';
import type { EmailProviderFactory } from './email-provider.factory';

describe('EmailDeliveryService', () => {
  it('preserves the retryable classification for NTF-001 queue handling', async () => {
    const provider: EmailProvider = {
      send: jest
        .fn()
        .mockRejectedValue(new EmailDeliveryError('rate_limited', true, 'resend')),
    };
    const service = new EmailDeliveryService({ create: () => provider } as EmailProviderFactory);

    await expect(
      service.send({
        correlationId: 'correlation-123',
        recipient: 'guest@example.test',
        subject: 'Synthetic subject',
        text: 'Synthetic body',
      }),
    ).rejects.toMatchObject({
      code: 'rate_limited',
      retryable: true,
    } satisfies Partial<EmailDeliveryError>);
  });
});
