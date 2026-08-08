import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxProcessor } from './outbox/outbox.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env['REDIS_HOST'] ?? '127.0.0.1',
        port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
      },
    }),
  ],
  providers: [OutboxProcessor],
})
export class WorkerModule {}
