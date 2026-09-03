import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './common/queues/queue.module';
import { HealthModule } from './modules/health/health.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AuthModule } from './modules/auth/auth.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { AuditModule } from './modules/audit/audit.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ContactModule } from './modules/contact/contact.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BbqModule } from './modules/bbq/bbq.module';
import { CmsModule } from './modules/cms/cms.module';
import { OpsModule } from './modules/ops/ops.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MetricsModule } from './common/metrics/metrics.module';

@Module({
  imports: [PrismaModule, QueueModule, HealthModule, CustomersModule, AuthModule, RoomsModule, AuditModule, PaymentsModule, SettingsModule, ContactModule, NotificationsModule, BbqModule, CmsModule, OpsModule, ReportsModule, MetricsModule],
})
export class AppModule {}
