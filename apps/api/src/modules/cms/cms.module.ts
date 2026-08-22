import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminContentPageController, PublicContentPageController } from './content-page.controller';
import { ContentPageService } from './content-page.service';
import { AdminMediaController } from './media.controller';
import { MediaService } from './media.service';
import { StorageConfigService } from './storage.config';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublicContentPageController, AdminContentPageController, AdminMediaController],
  providers: [ContentPageService, MediaService, StorageConfigService],
  exports: [ContentPageService, MediaService],
})
export class CmsModule {}
