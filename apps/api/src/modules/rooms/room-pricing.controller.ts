import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata.
import { RoomPriceQuoteDto } from './dto/room-price-quote.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { RoomPricingService } from './room-pricing.service';

@ApiTags('Room pricing') @ApiBearerAuth() @Controller('admin/room-price-quotes') @UseGuards(AdminAuthGuard, PermissionsGuard) @RequirePermissions('room.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks room.manage' })
export class RoomPricingController {
  constructor(private readonly pricing: RoomPricingService) {}
  @Post() @ApiOperation({ summary: 'Quote active nightly room rates using integer VND' })
  quote(@Body() dto: RoomPriceQuoteDto) { return this.pricing.quote(dto.roomTypeId, dto.dateFrom, dto.dateTo, dto.adults, dto.children); }
}
