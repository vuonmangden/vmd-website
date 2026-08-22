import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OpsDashboardController } from './ops-dashboard.controller';
import { OpsDashboardService } from './ops-dashboard.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OpsDashboardController],
  providers: [OpsDashboardService],
})
export class OpsModule {}
