import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SiteSettingsController } from './site-settings.controller';
import { SiteSettingsService } from './site-settings.service';
import { SystemSettingsController } from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SiteSettingsController, SystemSettingsController],
  providers: [SiteSettingsService, SystemSettingsService],
  exports: [SiteSettingsService, SystemSettingsService],
})
export class SettingsModule {}
