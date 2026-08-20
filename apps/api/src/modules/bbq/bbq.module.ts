import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import {
  AdminBbqAreaController,
  AdminBbqServiceSlotController,
  AdminBbqTableController,
  PublicBbqAreaController,
} from './bbq-area.controller';
import { BbqAreaService } from './bbq-area.service';
import { PublicBbqAvailabilityController } from './bbq-availability.controller';
import { BbqAvailabilityService } from './bbq-availability.service';
import { AdminBbqMenuController, PublicBbqMenuController } from './bbq-menu.controller';
import { BbqMenuService } from './bbq-menu.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    PublicBbqMenuController,
    PublicBbqAreaController,
    PublicBbqAvailabilityController,
    AdminBbqMenuController,
    AdminBbqAreaController,
    AdminBbqTableController,
    AdminBbqServiceSlotController,
  ],
  providers: [BbqMenuService, BbqAreaService, BbqAvailabilityService],
  exports: [BbqMenuService, BbqAreaService, BbqAvailabilityService],
})
export class BbqModule {}
