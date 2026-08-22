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
import { CreateArticleCategoryDto, UpdateArticleCategoryDto } from './dto/article-category.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { ArticleCategoryService } from './article-category.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('Article categories')
@Controller('public/article-categories')
export class PublicArticleCategoryController {
  constructor(private readonly categories: ArticleCategoryService) {}

  @Get()
  @ApiOperation({ summary: 'List active article categories' })
  list() {
    return this.categories.publicList();
  }
}

@ApiTags('Article categories')
@ApiBearerAuth()
@Controller('admin/article-categories')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('content.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks content.manage' })
export class AdminArticleCategoryController {
  constructor(private readonly categories: ArticleCategoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all article categories' })
  list() {
    return this.categories.listAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create an article category' })
  create(@Body() dto: CreateArticleCategoryDto, @Req() request: AuthenticatedRequest) {
    return this.categories.create(actor(request), dto, correlationId(request));
  }

  @Post(':id/update')
  @ApiOperation({ summary: 'Update an article category' })
  update(@Param('id') id: string, @Body() dto: UpdateArticleCategoryDto, @Req() request: AuthenticatedRequest) {
    return this.categories.update(actor(request), id, dto, correlationId(request));
  }
}

function actor(request: AuthenticatedRequest) {
  if (!request.actor) throw new Error('Authenticated actor is missing from request');
  return request.actor;
}

function correlationId(request: AuthenticatedRequest): string {
  const value = request.headers[CORRELATION_ID_HEADER];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
