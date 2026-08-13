import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './common/queues/queue.module';
import { HealthModule } from './modules/health/health.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AuthModule } from './modules/auth/auth.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { AuditModule } from './modules/audit/audit.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [PrismaModule, QueueModule, HealthModule, CustomersModule, AuthModule, RoomsModule, AuditModule, PaymentsModule],
})
export class AppModule {}
