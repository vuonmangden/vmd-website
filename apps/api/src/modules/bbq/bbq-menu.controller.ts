import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
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
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- ValidationPipe reads these classes from decorator metadata at runtime.
import { UpsertComboDto, UpsertMenuItemDto } from './dto/bbq-menu.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { BbqMenuService } from './bbq-menu.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('BBQ menu')
@Controller('public/bbq/menu')
export class PublicBbqMenuController {
  constructor(private readonly menu: BbqMenuService) {}

  @Get()
  @ApiOperation({ summary: 'Available BBQ dishes and combo sets' })
  list() {
    return this.menu.publicMenu();
  }
}

@ApiTags('BBQ menu')
@ApiBearerAuth()
@Controller('admin/bbq/menu')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('bbq.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks bbq.manage' })
export class AdminBbqMenuController {
  constructor(private readonly menu: BbqMenuService) {}

  @Get()
  @ApiOperation({ summary: 'Full menu including unavailable entries and internal notes' })
  list() {
    return this.menu.adminMenu();
  }

  @Put('items')
  @ApiOperation({ summary: 'Create or update a menu item by code' })
  upsertItem(@Body() dto: UpsertMenuItemDto, @Req() request: AuthenticatedRequest) {
    return this.menu.upsertMenuItem(
      request.actor!,
      { ...dto, price: BigInt(dto.price) },
      correlationId(request),
    );
  }

  @Put('combos')
  @ApiOperation({ summary: 'Create or update a combo set by code' })
  upsertCombo(@Body() dto: UpsertComboDto, @Req() request: AuthenticatedRequest) {
    return this.menu.upsertCombo(
      request.actor!,
      { ...dto, price: BigInt(dto.price) },
      correlationId(request),
    );
  }
}

function correlationId(request: AuthenticatedRequest): string {
  const value = request.headers[CORRELATION_ID_HEADER];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
