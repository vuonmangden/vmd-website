import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminContentPageController, PublicContentPageController } from './content-page.controller';
import { ContentPageService } from './content-page.service';
import { AdminMediaController } from './media.controller';
import { MediaService } from './media.service';
import { StorageConfigService } from './storage.config';
import { AdminArticleController, PublicArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { AdminArticleCategoryController, PublicArticleCategoryController } from './article-category.controller';
import { ArticleCategoryService } from './article-category.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    PublicContentPageController,
    AdminContentPageController,
    AdminMediaController,
    PublicArticleController,
    AdminArticleController,
    PublicArticleCategoryController,
    AdminArticleCategoryController,
  ],
  providers: [ContentPageService, MediaService, StorageConfigService, ArticleService, ArticleCategoryService],
  exports: [ContentPageService, MediaService, ArticleService, ArticleCategoryService],
})
export class CmsModule {}
