import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { NotificationJobService } from './notification-job.service';
import type { PaymentExceptionPayload } from './notification-job.service';

interface OutboxJobData {
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

/**
 * Consumes the `notification-send` queue `OutboxProcessor` publishes to.
 * Only turns the event into `NotificationJob` rows (Stage A) — actually
 * sending is `NotificationDispatchService`'s job (Stage B), so a slow or
 * failing provider never blocks the outbox from draining.
 */
@Injectable()
@Processor('notification-send')
export class NotificationSendProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationSendProcessor.name);

  constructor(private readonly jobs: NotificationJobService) {
    super();
  }

  async process(job: Job<OutboxJobData>): Promise<void> {
    const { eventType, payload } = job.data;

    switch (eventType) {
      case 'booking.confirmed.payment':
      case 'booking.confirmed.payment.sandbox':
        await this.jobs.enqueueBookingConfirmed(
          requireString(payload, 'bookingId'),
          requireString(payload, 'paymentIntentId'),
        );
        return;
      case 'bbq_reservation.confirmed.payment':
      case 'bbq_reservation.confirmed.payment.sandbox':
        await this.jobs.enqueueBbqConfirmed(
          requireString(payload, 'reservationId'),
          requireString(payload, 'paymentIntentId'),
        );
        return;
      case 'payment.reconciliation.required':
      case 'payment.reconciliation.required.sandbox':
        await this.jobs.enqueuePaymentException(payload as unknown as PaymentExceptionPayload);
        return;
      default:
        this.logger.warn(`No notification handling for event type "${eventType}" — ignoring`);
    }
  }
}

function requireString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== 'string' || !value) {
    throw new Error(`notification-send job payload missing required field "${key}"`);
  }
  return value;
}
