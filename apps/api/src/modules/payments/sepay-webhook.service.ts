import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { QUEUE_NAMES, RETRY_DEFAULTS } from '../../common/queues/queue.constants';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { SePayWebhookDto } from './dto/sepay-webhook.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { SePayWebhookConfigService } from './sepay-webhook.config';

const PROVIDER = 'SEPAY_TEST';

@Injectable()
export class SePayWebhookService {
  private readonly logger = new Logger(SePayWebhookService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: SePayWebhookConfigService,
    @InjectQueue(QUEUE_NAMES.PAYMENT_WEBHOOK) private readonly queue: Queue,
  ) {}

  async receive(payload: SePayWebhookDto, authorization: string | undefined, correlationId?: string) {
    if (!matchesApiKey(authorization, this.config.get().apiKey)) {
      this.logger.warn({ event: 'payment_webhook_auth_failed', correlationId });
      throw new UnauthorizedException({ code: 'WEBHOOK_UNAUTHORIZED', message: 'Webhook authentication failed' });
    }

    try {
      const event = await this.prisma.paymentWebhookEvent.create({
        data: {
          provider: PROVIDER,
          providerEventId: payload.id,
          signatureValid: true,
          payload: payload as unknown as Prisma.InputJsonValue,
          headers: sanitizedHeaders(correlationId),
          processingStatus: 'RECEIVED',
        },
      });
      await this.queue.add('process-sepay-transaction', { eventId: event.id }, {
        jobId: `sepay:${payload.id}`,
        ...RETRY_DEFAULTS.PAYMENT_WEBHOOK,
      });
      return { received: true, duplicate: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.paymentWebhookEvent.findUnique({
          where: { provider_providerEventId: { provider: PROVIDER, providerEventId: payload.id } },
          select: { id: true, processingStatus: true },
        });
        if (existing?.processingStatus === 'RECEIVED') {
          await this.queue.add('process-sepay-transaction', { eventId: existing.id }, {
            jobId: `sepay:${payload.id}`,
            ...RETRY_DEFAULTS.PAYMENT_WEBHOOK,
          });
        }
        return { received: true, duplicate: true };
      }
      throw error;
    }
  }
}

function matchesApiKey(authorization: string | undefined, apiKey: string): boolean {
  const expected = Buffer.from(`Apikey ${apiKey}`);
  const actual = Buffer.from(authorization ?? '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sanitizedHeaders(correlationId: string | undefined): Prisma.InputJsonValue {
  return correlationId ? { correlationId } : {};
}
