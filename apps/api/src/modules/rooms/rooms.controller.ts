import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { CreateRoomDto } from './dto/create-room.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime class for DI metadata.
import { RoomsService } from './rooms.service';

@ApiTags('Rooms') @ApiBearerAuth() @Controller('admin/rooms') @UseGuards(AdminAuthGuard, PermissionsGuard) @RequirePermissions('room.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks room.manage' })
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}
  @Post() @ApiOperation({ summary: 'Create a physical room' })
  create(@Body() dto: CreateRoomDto) { return this.rooms.create(dto); }
  @Get() @ApiOperation({ summary: 'List non-archived physical rooms' })
  list() { return this.rooms.list(); }
  @Post(':id/archive') @ApiOperation({ summary: 'Archive a physical room without hard deletion' })
  archive(@Param('id') id: string) { return this.rooms.archive(id); }
}
