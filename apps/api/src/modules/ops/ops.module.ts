import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OpsDashboardController } from './ops-dashboard.controller';
import { OpsDashboardService } from './ops-dashboard.service';
import { OpsCalendarController } from './ops-calendar.controller';
import { OpsCalendarService } from './ops-calendar.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OpsDashboardController, OpsCalendarController],
  providers: [OpsDashboardService, OpsCalendarService],
})
export class OpsModule {}
