import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { RoomPricingService } from './room-pricing.service';

const publicRoomSelect = {
  name: true, slug: true, shortDescription: true, description: true, standardAdults: true,
  maxAdults: true, maxChildren: true, maxTotalGuests: true, bedConfiguration: true, amenities: true,
} satisfies Prisma.RoomTypeSelect;

type PublicRoomRecord = Prisma.RoomTypeGetPayload<{ select: typeof publicRoomSelect }>;

@Injectable()
export class PublicRoomsService {
  constructor(private readonly prisma: PrismaService, private readonly pricing: RoomPricingService) {}

  async list() {
    const rooms = await this.prisma.roomType.findMany({
      where: { status: 'ACTIVE', deletedAt: null }, select: publicRoomSelect, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { items: rooms.map(toPublicRoom) };
  }

  async findBySlug(slug: string) {
    const room = await this.prisma.roomType.findFirst({ where: { slug, status: 'ACTIVE', deletedAt: null }, select: publicRoomSelect });
    if (!room) throw new NotFoundException({ code: 'PUBLIC_ROOM_NOT_FOUND', message: 'Room type is not available' });
    return toPublicRoom(room);
  }

  async availability(checkIn: string, checkOut: string, guests: number) {
    const start = date(checkIn); const end = date(checkOut);
    const rooms = await this.prisma.roomType.findMany({
      where: {
        status: 'ACTIVE', deletedAt: null, maxTotalGuests: { gte: guests },
        rooms: { some: { status: 'ACTIVE', deletedAt: null, blocks: { none: { cancelledAt: null, startDate: { lt: end }, endDate: { gt: start } } } } },
      },
      select: publicRoomSelect, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { items: rooms.map(toPublicRoom) };
  }

  async quote(slug: string, dateFrom: string, dateTo: string, adults: number, children: number) {
    const room = await this.prisma.roomType.findFirst({ where: { slug, status: 'ACTIVE', deletedAt: null }, select: { id: true } });
    if (!room) throw new NotFoundException({ code: 'PUBLIC_ROOM_NOT_FOUND', message: 'Room type is not available' });
    const quote = await this.pricing.quote(room.id, dateFrom, dateTo, adults, children);
    return {
      currency: 'VND', nights: quote.nights, nightlySubtotal: Number(quote.nightlySubtotal),
      extraGuestSubtotal: Number(quote.extraGuestSubtotal), total: Number(quote.total), isSandbox: true,
    };
  }
}

function toPublicRoom(room: PublicRoomRecord) {
  return {
    name: room.name, slug: room.slug, shortDescription: room.shortDescription, description: room.description,
    capacity: { standardAdults: room.standardAdults, maxAdults: room.maxAdults, maxChildren: room.maxChildren, maxTotalGuests: room.maxTotalGuests },
    bedConfiguration: room.bedConfiguration, amenities: room.amenities, isSandbox: true,
  };
}

function date(value: string): Date {
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime())) throw new BadRequestException({ code: 'INVALID_PUBLIC_ROOM_QUERY', message: 'Room search input is invalid' });
  return result;
}
