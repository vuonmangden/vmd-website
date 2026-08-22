import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxProcessor } from './outbox/outbox.processor';
import { EmailDeliveryService } from './notification/email/email-delivery.service';
import { EmailProviderFactory } from './notification/email/email-provider.factory';
import { ZaloDeliveryService } from './notification/zalo/zalo-delivery.service';
import { ZaloProviderFactory } from './notification/zalo/zalo-provider.factory';

const OUTBOX_PUBLISH_QUEUE = 'outbox-publish';
const NOTIFICATION_SEND_QUEUE = 'notification-send';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env['REDIS_HOST'] ?? '127.0.0.1',
        port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
      },
    }),
    BullModule.registerQueue(
      { name: OUTBOX_PUBLISH_QUEUE },
      { name: NOTIFICATION_SEND_QUEUE },
    ),
  ],
  providers: [
    OutboxProcessor,
    EmailProviderFactory,
    EmailDeliveryService,
    ZaloProviderFactory,
    ZaloDeliveryService,
  ],
  exports: [EmailDeliveryService, ZaloDeliveryService],
})
export class WorkerModule {}
