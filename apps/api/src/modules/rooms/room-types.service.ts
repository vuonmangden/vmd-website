import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateRoomTypeDto } from './dto/create-room-type.dto';
import type { UpdateRoomTypeDto } from './dto/update-room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomTypeDto) {
    assertCapacity(dto);
    return this.prisma.roomType.create({ data: toCreateData(dto) });
  }

  list() {
    return this.prisma.roomType.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string) {
    const roomType = await this.prisma.roomType.findFirst({ where: { id, deletedAt: null } });
    if (!roomType) throw new NotFoundException({ code: 'ROOM_TYPE_NOT_FOUND', message: 'Room type not found' });
    return roomType;
  }

  async update(id: string, dto: UpdateRoomTypeDto) {
    const current = await this.findById(id);
    assertCapacity({
      standardAdults: dto.standardAdults ?? current.standardAdults,
      maxAdults: dto.maxAdults ?? current.maxAdults,
      maxChildren: dto.maxChildren ?? current.maxChildren,
      maxTotalGuests: dto.maxTotalGuests ?? current.maxTotalGuests,
    });
    return this.prisma.roomType.update({ where: { id }, data: toUpdateData(dto) });
  }

  async archive(id: string) {
    await this.findById(id);
    return this.prisma.roomType.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } });
  }
}

function assertCapacity(value: { standardAdults: number; maxAdults: number; maxChildren?: number; maxTotalGuests: number }): void {
  if (value.maxAdults < value.standardAdults || value.maxTotalGuests < value.maxAdults) {
    throw new BadRequestException({ code: 'INVALID_ROOM_CAPACITY', message: 'Invalid room capacity' });
  }
}

function toCreateData(dto: CreateRoomTypeDto): Prisma.RoomTypeCreateInput {
  return {
    code: dto.code.trim(), name: dto.name.trim(), slug: dto.slug.trim().toLowerCase(),
    shortDescription: dto.shortDescription?.trim(), description: dto.description?.trim(),
    standardAdults: dto.standardAdults, maxAdults: dto.maxAdults, maxChildren: dto.maxChildren ?? 0,
    maxTotalGuests: dto.maxTotalGuests, bedConfiguration: dto.bedConfiguration ?? [], amenities: dto.amenities ?? [],
    status: dto.status ?? 'DRAFT', sortOrder: dto.sortOrder ?? 0,
  };
}

function toUpdateData(dto: UpdateRoomTypeDto): Prisma.RoomTypeUpdateInput {
  const data: Prisma.RoomTypeUpdateInput = {};
  if (dto.name !== undefined) data.name = dto.name.trim();
  if (dto.slug !== undefined) data.slug = dto.slug.trim().toLowerCase();
  if (dto.shortDescription !== undefined) data.shortDescription = dto.shortDescription.trim();
  if (dto.description !== undefined) data.description = dto.description.trim();
  if (dto.standardAdults !== undefined) data.standardAdults = dto.standardAdults;
  if (dto.maxAdults !== undefined) data.maxAdults = dto.maxAdults;
  if (dto.maxChildren !== undefined) data.maxChildren = dto.maxChildren;
  if (dto.maxTotalGuests !== undefined) data.maxTotalGuests = dto.maxTotalGuests;
  if (dto.bedConfiguration !== undefined) data.bedConfiguration = dto.bedConfiguration;
  if (dto.amenities !== undefined) data.amenities = dto.amenities;
  if (dto.status !== undefined) data.status = dto.status;
  if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
  return data;
}
