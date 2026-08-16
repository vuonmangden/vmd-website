import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './common/queues/queue.module';
import { ThrottleModule } from './common/throttle/throttle.module';
import { HealthModule } from './modules/health/health.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [PrismaModule, QueueModule, ThrottleModule, HealthModule, CustomersModule, AuthModule, AuditModule],
})
export class AppModule {}
