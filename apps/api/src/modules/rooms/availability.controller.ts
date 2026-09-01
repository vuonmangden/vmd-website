import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata.
import { AvailabilitySearchDto } from './dto/availability-search.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { AvailabilityService } from './availability.service';

@ApiTags('Room availability') @ApiBearerAuth() @Controller('admin/room-availability') @UseGuards(AdminAuthGuard, PermissionsGuard) @RequirePermissions('room.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks room.manage' })
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}
  @Post() @ApiOperation({ summary: 'Search production room availability excluding blocks and booking occupancy' })
  search(@Body() dto: AvailabilitySearchDto) { return this.availability.search(dto.checkIn, dto.checkOut, dto.guests); }
}
