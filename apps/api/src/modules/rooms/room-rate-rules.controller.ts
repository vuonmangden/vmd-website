import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { CreateRoomRateRuleDto } from './dto/create-room-rate-rule.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime class for DI metadata.
import { RoomRateRulesService } from './room-rate-rules.service';

@ApiTags('Room rate rules') @ApiBearerAuth() @Controller('admin/room-rate-rules') @UseGuards(AdminAuthGuard, PermissionsGuard) @RequirePermissions('room.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks room.manage' })
export class RoomRateRulesController {
  constructor(private readonly rules: RoomRateRulesService) {}
  @Post() @ApiOperation({ summary: 'Create a sandbox room rate rule; values are not production rates' })
  create(@Body() dto: CreateRoomRateRuleDto) { return this.rules.create(dto); }
  @Get() @ApiOperation({ summary: 'List sandbox room rate rules' })
  list(@Query('roomTypeId') roomTypeId?: string) { return this.rules.list(roomTypeId); }
}
