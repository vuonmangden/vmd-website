import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { ArticleService } from './article.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('Articles')
@Controller('public/articles')
export class PublicArticleController {
  constructor(private readonly articles: ArticleService) {}

  @Get()
  @ApiOperation({ summary: 'List published articles' })
  list() {
    return this.articles.publicList();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Read one published article by slug' })
  get(@Param('slug') slug: string) {
    return this.articles.publicGet(slug);
  }
}

@ApiTags('Articles')
@ApiBearerAuth()
@Controller('admin/articles')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('content.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks content.manage' })
export class AdminArticleController {
  constructor(private readonly articles: ArticleService) {}

  @Get()
  @ApiOperation({ summary: 'List all articles including drafts' })
  list() {
    return this.articles.listAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one article' })
  detail(@Param('id') id: string) {
    return this.articles.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an article as a draft' })
  create(@Body() dto: CreateArticleDto, @Req() request: AuthenticatedRequest) {
    return this.articles.create(actor(request), dto, correlationId(request));
  }

  @Post(':id/update')
  @ApiOperation({ summary: 'Update an article' })
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto, @Req() request: AuthenticatedRequest) {
    return this.articles.update(actor(request), id, dto, correlationId(request));
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish an article' })
  publish(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.articles.publish(actor(request), id, correlationId(request));
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Return a published article to draft' })
  unpublish(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.articles.unpublish(actor(request), id, correlationId(request));
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive an article' })
  archive(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.articles.archive(actor(request), id, correlationId(request));
  }
}

/**
 * AdminAuthGuard populates `actor` before any handler runs, so a missing
 * actor here means the guard was bypassed — fail loudly rather than
 * continue with an unauthenticated request.
 */
function actor(request: AuthenticatedRequest) {
  if (!request.actor) throw new Error('Authenticated actor is missing from request');
  return request.actor;
}

function correlationId(request: AuthenticatedRequest): string {
  const value = request.headers[CORRELATION_ID_HEADER];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
