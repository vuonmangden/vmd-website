import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateRoomBlockDto } from './dto/create-room-block.dto';

@Injectable()
export class RoomBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(roomId: string, actorId: string, dto: CreateRoomBlockDto) {
    const startDate = dateOnly(dto.startDate);
    const endDate = dateOnly(dto.endDate);
    if (endDate <= startDate) throw invalidBlock();
    const room = await this.prisma.room.findFirst({ where: { id: roomId, deletedAt: null } });
    if (!room) throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return this.prisma.roomBlock.create({ data: { roomId, createdBy: actorId, startDate, endDate, reason: dto.reason.trim(), blockType: dto.blockType } });
  }

  async cancel(roomId: string, blockId: string) {
    const block = await this.prisma.roomBlock.findFirst({ where: { id: blockId, roomId, cancelledAt: null } });
    if (!block) throw new NotFoundException({ code: 'ROOM_BLOCK_NOT_FOUND', message: 'Active room block not found' });
    return this.prisma.roomBlock.update({ where: { id: blockId }, data: { cancelledAt: new Date() } });
  }
}

function dateOnly(value: string): Date { return new Date(`${value}T00:00:00.000Z`); }
function invalidBlock(): BadRequestException { return new BadRequestException({ code: 'INVALID_ROOM_BLOCK', message: 'Room block date range is invalid' }); }
