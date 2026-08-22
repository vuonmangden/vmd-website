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
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { SystemSettingsService } from './system-settings.service';
import type { SystemSettingView } from './system-settings.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('System settings')
@ApiBearerAuth()
@Controller('admin/settings')
@UseGuards(AdminAuthGuard)
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks access to system settings' })
export class SystemSettingsController {
  constructor(private readonly settings: SystemSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'List technical/operational settings (distinct from CMS-001 site settings)' })
  list(@Req() request: Request): Promise<SystemSettingView[]> {
    return this.settings.list(actorOf(request));
  }

  @Put()
  @ApiOperation({ summary: 'Update one technical/operational setting' })
  update(
    @Body() dto: UpdateSystemSettingDto,
    @Req() request: Request,
  ): Promise<SystemSettingView> {
    return this.settings.update(
      actorOf(request),
      { key: dto.key, value: dto.value, expectedUpdatedAt: dto.expectedUpdatedAt },
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
