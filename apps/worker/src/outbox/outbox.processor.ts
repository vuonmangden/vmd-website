import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PrismaService } from '../prisma/prisma.service';
import type { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 50;

/**
 * Maps real `outbox_events.event_type` values to a queue. Keep this in sync
 * with the actual `eventType` strings each API service writes — event names
 * carry a `.sandbox`/`.public_sandbox` suffix while the booking/payment flow
 * is on the Phase 1 synthetic lane; NTF-004 only wires the three that have
 * an approved notification template (see docs/08_PROGRESS_TRACKER.md
 * NTF-004). Everything else falls through to `outbox-publish` and is a
 * deliberate no-op — there's no template for it (yet).
 */
const EVENT_QUEUE_MAP: Record<string, string> = {
  'booking.confirmed.payment.sandbox': 'notification-send',
  'bbq_reservation.confirmed.payment.sandbox': 'notification-send',
  'payment.reconciliation.required.sandbox': 'notification-send',
};

@Injectable()
export class OutboxProcessor implements OnModuleInit {
  private readonly logger = new Logger(OutboxProcessor.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly queues = new Map<string, Queue>();

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('outbox-publish') outboxQueue: Queue,
    @InjectQueue('notification-send') notificationQueue: Queue,
  ) {
    this.registerQueue('outbox-publish', outboxQueue);
    this.registerQueue('notification-send', notificationQueue);
  }

  registerQueue(name: string, queue: Queue): void {
    this.queues.set(name, queue);
  }

  onModuleInit(): void {
    this.timer = setInterval(() => {
      /**
       * The per-event `try` inside `pollAndPublish` does not cover its
       * opening `findMany`, so a transient database error would escape as an
       * unhandled rejection and terminate the worker. Log and retry on the
       * next tick instead — that is the whole point of a polling loop.
       */
      this.pollAndPublish().catch((error: unknown) => {
        this.logger.error(`Outbox poll failed; retrying next interval: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, POLL_INTERVAL_MS);
    this.logger.log('Outbox processor started');
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async pollAndPublish(): Promise<number> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (events.length === 0) return 0;

    let published = 0;
    for (const event of events) {
      try {
        const queueName =
          EVENT_QUEUE_MAP[event.eventType] ?? 'outbox-publish';
        const queue = this.queues.get(queueName);

        if (!queue) {
          throw new Error(`Queue ${queueName} is not registered`);
        }

        await queue.add(
          event.eventType,
          {
            eventId: event.id,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            eventType: event.eventType,
            payload: event.payload,
          },
          { jobId: event.id },
        );

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'published',
            publishedAt: new Date(),
            attemptCount: event.attemptCount + 1,
          },
        });

        published++;
      } catch (error) {
        this.logger.error(
          `Failed to publish outbox event ${event.id}: ${error instanceof Error ? error.message : String(error)}`,
        );

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: event.attemptCount >= 4 ? 'failed' : 'pending',
            attemptCount: event.attemptCount + 1,
          },
        });
      }
    }

    if (published > 0) {
      this.logger.log(`Published ${published}/${events.length} outbox events`);
    }

    return published;
  }
}
