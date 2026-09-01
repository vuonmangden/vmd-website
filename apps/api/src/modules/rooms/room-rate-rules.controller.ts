import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { CreateRoomRateRuleDto } from './dto/create-room-rate-rule.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata.
import { UpdateRoomRateRuleDto } from './dto/update-room-rate-rule.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime class for DI metadata.
import { RoomRateRulesService } from './room-rate-rules.service';

@ApiTags('Room rate rules') @ApiBearerAuth() @Controller('admin/room-rate-rules') @UseGuards(AdminAuthGuard, PermissionsGuard) @RequirePermissions('room.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks room.manage' })
export class RoomRateRulesController {
  constructor(private readonly rules: RoomRateRulesService) {}
  @Post() @ApiOperation({ summary: 'Create a room rate rule using integer VND values' })
  create(@Body() dto: CreateRoomRateRuleDto, @Req() request: Request) { return this.rules.create(dto, actorId(request), correlationId(request)); }
  @Post(':id/update') @ApiOperation({ summary: 'Update a room rate rule with an audited reason' })
  update(@Param('id') id: string, @Body() dto: UpdateRoomRateRuleDto, @Req() request: Request) { return this.rules.update(id, dto, actorId(request), correlationId(request)); }
  @Get('catalog-policy') @ApiOperation({ summary: 'Get the approved production room pricing policy and holiday-price metadata' })
  catalogPolicy() { return this.rules.catalogPolicy(); }
  @Get() @ApiOperation({ summary: 'List room rate rules' })
  list(@Query('roomTypeId') roomTypeId?: string) { return this.rules.list(roomTypeId); }
}

function actorId(request: Request): string {
  const id = (request as AuthenticatedRequest).actor?.staffProfileId;
  if (!id) throw new Error('Authenticated actor is missing from request');
  return id;
}
function correlationId(request: Request): string {
  const value = request.headers['x-correlation-id'];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
