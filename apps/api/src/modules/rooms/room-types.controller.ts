import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { RoomTypesService } from './room-types.service';

@ApiTags('Room types')
@ApiBearerAuth()
@Controller('admin/room-types')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('room.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks room.manage' })
export class RoomTypesController {
  constructor(private readonly roomTypes: RoomTypesService) {}

  @Post() @ApiOperation({ summary: 'Create a room type (synthetic/staging-only until PRE-001)' })
  create(@Body() dto: CreateRoomTypeDto) { return this.roomTypes.create(dto); }

  @Get() @ApiOperation({ summary: 'List non-archived room types' })
  list() { return this.roomTypes.list(); }

  @Get(':id') @ApiOperation({ summary: 'Get a room type by ID' })
  get(@Param('id') id: string) { return this.roomTypes.findById(id); }

  @Post(':id/update') @ApiOperation({ summary: 'Update a room type' })
  update(@Param('id') id: string, @Body() dto: UpdateRoomTypeDto) { return this.roomTypes.update(id, dto); }

  @Post(':id/archive') @ApiOperation({ summary: 'Archive a room type without hard deletion' })
  archive(@Param('id') id: string) { return this.roomTypes.archive(id); }
}
