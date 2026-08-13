import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../common/queues/queue.constants';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PaymentProcessingService } from './payment-processing.service';

interface PaymentWebhookJob { eventId: string; }

@Processor(QUEUE_NAMES.PAYMENT_WEBHOOK)
export class PaymentWebhookProcessor extends WorkerHost {
  constructor(private readonly processing: PaymentProcessingService) { super(); }
  process(job: Job<PaymentWebhookJob>) { return this.processing.processWebhookEvent(job.data.eventId); }
}
