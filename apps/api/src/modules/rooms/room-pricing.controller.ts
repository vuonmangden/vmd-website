import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata.
import { SandboxPriceQuoteDto } from './dto/sandbox-price-quote.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { RoomPricingService } from './room-pricing.service';

@ApiTags('Sandbox pricing') @ApiBearerAuth() @Controller('admin/sandbox/room-price-quotes') @UseGuards(AdminAuthGuard, PermissionsGuard) @RequirePermissions('room.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks room.manage' })
export class RoomPricingController {
  constructor(private readonly pricing: RoomPricingService) {}
  @Post() @ApiOperation({ summary: 'Calculate a synthetic internal room-price quote; not a production offer' })
  quote(@Body() dto: SandboxPriceQuoteDto) { return this.pricing.quote(dto.roomTypeId, dto.dateFrom, dto.dateTo, dto.adults, dto.children); }
}
