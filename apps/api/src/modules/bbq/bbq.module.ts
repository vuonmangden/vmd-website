import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminBbqMenuController, PublicBbqMenuController } from './bbq-menu.controller';
import { BbqMenuService } from './bbq-menu.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublicBbqMenuController, AdminBbqMenuController],
  providers: [BbqMenuService],
  exports: [BbqMenuService],
})
export class BbqModule {}
