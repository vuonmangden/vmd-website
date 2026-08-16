import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './common/queues/queue.module';
import { ThrottleModule } from './common/throttle/throttle.module';
import { HealthModule } from './modules/health/health.module';
import { CustomersModule } from './modules/customers/customers.module';

@Module({
  imports: [PrismaModule, QueueModule, ThrottleModule, HealthModule, CustomersModule],
})
export class AppModule {}
