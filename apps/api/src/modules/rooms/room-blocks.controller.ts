import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { CreateRoomBlockDto } from './dto/create-room-block.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { RoomBlocksService } from './room-blocks.service';

@ApiTags('Room blocks') @ApiBearerAuth() @Controller('admin/rooms/:roomId/blocks') @UseGuards(AdminAuthGuard, PermissionsGuard) @RequirePermissions('room.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks room.manage' })
export class RoomBlocksController {
  constructor(private readonly blocks: RoomBlocksService) {}
  @Post() @ApiOperation({ summary: 'Create a sandbox room block' })
  create(@Param('roomId') roomId: string, @Req() request: AuthenticatedRequest, @Body() dto: CreateRoomBlockDto) { return this.blocks.create(roomId, request.actor!.staffProfileId, dto); }
  @Delete(':blockId') @ApiOperation({ summary: 'Cancel an active sandbox room block' })
  cancel(@Param('roomId') roomId: string, @Param('blockId') blockId: string) { return this.blocks.cancel(roomId, blockId); }
}
