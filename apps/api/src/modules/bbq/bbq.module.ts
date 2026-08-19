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
import { AdminBbqMenuController, PublicBbqMenuController } from './bbq-menu.controller';
import { BbqMenuService } from './bbq-menu.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    PublicBbqMenuController,
    PublicBbqAreaController,
    AdminBbqMenuController,
    AdminBbqAreaController,
    AdminBbqTableController,
    AdminBbqServiceSlotController,
  ],
  providers: [BbqMenuService, BbqAreaService],
  exports: [BbqMenuService, BbqAreaService],
})
export class BbqModule {}
