import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { CustomersModule } from './modules/customers/customers.module';

@Module({
  imports: [PrismaModule, HealthModule, CustomersModule],
})
export class AppModule {}
