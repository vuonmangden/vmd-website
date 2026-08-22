import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminContentPageController, PublicContentPageController } from './content-page.controller';
import { ContentPageService } from './content-page.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublicContentPageController, AdminContentPageController],
  providers: [ContentPageService],
  exports: [ContentPageService],
})
export class CmsModule {}
