import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationModule } from './notifications/notification.module';
import { OutboxProcessor } from './outbox/outbox.processor';

const OUTBOX_PUBLISH_QUEUE = 'outbox-publish';
const NOTIFICATION_SEND_QUEUE = 'notification-send';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
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
  providers: [OutboxProcessor],
})
export class WorkerModule {}
