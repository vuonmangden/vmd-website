import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
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
import { CompleteMediaUploadDto, RequestMediaUploadDto } from './dto/media.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { MediaService } from './media.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('Media')
@ApiBearerAuth()
@Controller('admin/media')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('content.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks content.manage' })
export class AdminMediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  @ApiOperation({ summary: 'List media assets' })
  list() {
    return this.media.list();
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Request a signed URL to upload one image directly to storage' })
  requestUpload(@Body() dto: RequestMediaUploadDto, @Req() request: AuthenticatedRequest) {
    return this.media.requestUpload(actor(request), dto, correlationId(request));
  }

  @Post('complete')
  @ApiOperation({ summary: 'Confirm a media upload after the browser has uploaded it to storage' })
  complete(@Body() dto: CompleteMediaUploadDto, @Req() request: AuthenticatedRequest) {
    return this.media.completeUpload(actor(request), dto.mediaId, correlationId(request));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a media asset (soft delete; the stored object is not removed)' })
  archive(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.media.archive(actor(request), id, correlationId(request));
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
