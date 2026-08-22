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
import { CreateContentPageDto, UpdateContentPageDto } from './dto/content-page.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { ContentPageService } from './content-page.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('Content pages')
@Controller('public/content-pages')
export class PublicContentPageController {
  constructor(private readonly pages: ContentPageService) {}

  @Get()
  @ApiOperation({ summary: 'List published content pages' })
  list() {
    return this.pages.publicList();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Read one published content page by slug' })
  get(@Param('slug') slug: string) {
    return this.pages.publicGet(slug);
  }
}

@ApiTags('Content pages')
@ApiBearerAuth()
@Controller('admin/content-pages')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('content.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks content.manage' })
export class AdminContentPageController {
  constructor(private readonly pages: ContentPageService) {}

  @Get()
  @ApiOperation({ summary: 'List all content pages including drafts' })
  list() {
    return this.pages.listAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one content page' })
  detail(@Param('id') id: string) {
    return this.pages.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a content page as a draft' })
  create(@Body() dto: CreateContentPageDto, @Req() request: AuthenticatedRequest) {
    return this.pages.create(actor(request), dto, correlationId(request));
  }

  @Post(':id/update')
  @ApiOperation({ summary: 'Update a content page' })
  update(@Param('id') id: string, @Body() dto: UpdateContentPageDto, @Req() request: AuthenticatedRequest) {
    return this.pages.update(actor(request), id, dto, correlationId(request));
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a content page' })
  publish(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.pages.publish(actor(request), id, correlationId(request));
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Return a published content page to draft' })
  unpublish(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.pages.unpublish(actor(request), id, correlationId(request));
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a content page' })
  archive(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.pages.archive(actor(request), id, correlationId(request));
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
