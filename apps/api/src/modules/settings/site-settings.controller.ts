import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import type { AuthenticatedActor, AuthenticatedRequest } from '../auth/auth.types';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- ValidationPipe reads this class from decorator metadata at runtime; a type-only import would silently disable validation.
import { UpdateSiteSettingDto } from './dto/update-site-setting.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { SiteSettingsService } from './site-settings.service';
import type { SiteSettingView } from './site-settings.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('Site settings')
@ApiBearerAuth()
@Controller('admin/site-settings')
@UseGuards(AdminAuthGuard)
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks access to site settings' })
export class SiteSettingsController {
  constructor(private readonly settings: SiteSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'List editable site settings' })
  list(@Req() request: Request): Promise<SiteSettingView[]> {
    return this.settings.list(actorOf(request));
  }

  @Put()
  @ApiOperation({ summary: 'Update one site setting' })
  update(
    @Body() dto: UpdateSiteSettingDto,
    @Req() request: Request,
  ): Promise<SiteSettingView> {
    return this.settings.update(
      actorOf(request),
      { key: dto.key, value: dto.value },
      correlationId(request),
    );
  }
}

/**
 * AdminAuthGuard populates `actor` before any handler runs, so a missing
 * actor here means the guard was bypassed — fail loudly rather than
 * continue with an unauthenticated request.
 */
function actorOf(request: Request): AuthenticatedActor {
  const actor = (request as AuthenticatedRequest).actor;
  if (!actor) throw new Error('Authenticated actor is missing from request');
  return actor;
}

function correlationId(request: Request): string {
  const value = request.headers[CORRELATION_ID_HEADER];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
