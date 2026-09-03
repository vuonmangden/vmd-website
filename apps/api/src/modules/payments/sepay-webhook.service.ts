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

@Injectable()
export class SePayWebhookService {
  private readonly logger = new Logger(SePayWebhookService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: SePayWebhookConfigService,
    @InjectQueue(QUEUE_NAMES.PAYMENT_WEBHOOK) private readonly queue: Queue,
  ) {}

  async receive(payload: SePayWebhookDto, authorization: string | undefined, correlationId?: string) {
    const config = this.config.get();
    if (!matchesApiKey(authorization, config.apiKey)) {
      this.logger.warn({ event: 'payment_webhook_auth_failed', correlationId });
      throw new UnauthorizedException({ code: 'WEBHOOK_UNAUTHORIZED', message: 'Webhook authentication failed' });
    }

    try {
      const event = await this.prisma.paymentWebhookEvent.create({
        data: {
          provider: config.provider,
          providerEventId: payload.id,
          providerTransactionId: providerTransactionId(payload),
          signatureValid: true,
          payload: payload as unknown as Prisma.InputJsonValue,
          headers: sanitizedHeaders(correlationId),
          processingStatus: 'RECEIVED',
        },
      });
      await this.queue.add('process-sepay-transaction', { eventId: event.id }, {
        jobId: sepayJobId(payload.id),
        ...RETRY_DEFAULTS.PAYMENT_WEBHOOK,
      });
      return { received: true, duplicate: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existingByEvent = await this.prisma.paymentWebhookEvent.findUnique({
          where: { provider_providerEventId: { provider: config.provider, providerEventId: payload.id } },
          select: { id: true, processingStatus: true },
        });
        const existing = existingByEvent ?? await this.prisma.paymentWebhookEvent.findUnique({
          where: { provider_providerTransactionId: { provider: config.provider, providerTransactionId: providerTransactionId(payload) } },
          select: { id: true, processingStatus: true },
        });
        if (existing?.processingStatus === 'RECEIVED') {
          await this.queue.add('process-sepay-transaction', { eventId: existing.id }, {
            jobId: sepayJobId(payload.id),
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

function providerTransactionId(payload: SePayWebhookDto): string {
  return (payload.referenceCode.trim() || payload.id).slice(0, 150);
}

/**
 * SEC-002: `sepay:${payload.id}` (the previous form) crashes BullMQ's
 * `Job.validateOptions()` — a custom `jobId` may only contain a colon if
 * splitting on `:` yields exactly 3 parts (a legacy compatibility rule for
 * BullMQ's own repeatable-job IDs), and a plain `prefix:id` yields 2. This
 * was never caught by unit tests because they mock the queue, so the real
 * BullMQ validation never ran — every live webhook call threw before a
 * processing job was ever queued. Avoids `:` entirely, and strips any colon
 * `payload.id` might itself contain (external provider data, not otherwise
 * format-constrained) so this can't regress by coincidence of input shape.
 */
function sepayJobId(payloadId: string): string {
  return `sepay-${payloadId.replaceAll(':', '_')}`;
}
