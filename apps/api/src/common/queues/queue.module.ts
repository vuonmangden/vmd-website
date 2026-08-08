import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queue.constants';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env['REDIS_HOST'] ?? '127.0.0.1',
        port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.OUTBOX_PUBLISH },
      { name: QUEUE_NAMES.NOTIFICATION_SEND },
      { name: QUEUE_NAMES.NOTIFICATION_SCHEDULE },
      { name: QUEUE_NAMES.PAYMENT_WEBHOOK },
      { name: QUEUE_NAMES.BOOKING_HOLD_EXPIRY },
      { name: QUEUE_NAMES.BBQ_HOLD_EXPIRY },
      { name: QUEUE_NAMES.MEDIA_PROCESS },
      { name: QUEUE_NAMES.REPORT_EXPORT },
      { name: QUEUE_NAMES.MAINTENANCE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
