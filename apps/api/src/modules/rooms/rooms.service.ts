import { Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomDto) {
    const roomType = await this.prisma.roomType.findFirst({ where: { id: dto.roomTypeId, deletedAt: null } });
    if (!roomType) throw new NotFoundException({ code: 'ROOM_TYPE_NOT_FOUND', message: 'Room type not found' });
    return this.prisma.room.create({ data: {
      roomTypeId: dto.roomTypeId, code: dto.code.trim(), name: dto.name.trim(), floor: dto.floor?.trim(),
      areaZone: dto.areaZone?.trim(), status: dto.status ?? 'INACTIVE', maintenanceNotes: dto.maintenanceNotes?.trim(),
    } });
  }

  list() { return this.prisma.room.findMany({ where: { deletedAt: null }, include: { roomType: { select: { code: true, name: true } } }, orderBy: { code: 'asc' } }); }

  async archive(id: string) {
    const room = await this.prisma.room.findFirst({ where: { id, deletedAt: null } });
    if (!room) throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return this.prisma.room.update({ where: { id }, data: { status: 'INACTIVE', deletedAt: new Date() } });
  }
}
