import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
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
type CommercialPolicy = {
  pricesIncludeVat: false;
  extraMattress: { maxPerRoom: number; guestCapacityPerMattress: number; price: number; currency: 'VND' };
};

const PRODUCTION_CATALOG_SETTING_KEY = 'room.catalog.production';
const PRODUCTION_CATALOG_VERSION = '2026-09-01.v1';

@Injectable()
export class PublicRoomsService {
  constructor(private readonly prisma: PrismaService, private readonly pricing: RoomPricingService) {}

  async list() {
    const [rooms, policy] = await Promise.all([
      this.prisma.roomType.findMany({
        where: { status: 'ACTIVE', deletedAt: null }, select: publicRoomSelect, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.commercialPolicy(),
    ]);
    return { items: rooms.map((room) => toPublicRoom(room, policy)) };
  }

  async findBySlug(slug: string) {
    const [room, policy] = await Promise.all([
      this.prisma.roomType.findFirst({ where: { slug, status: 'ACTIVE', deletedAt: null }, select: publicRoomSelect }),
      this.commercialPolicy(),
    ]);
    if (!room) throw new NotFoundException({ code: 'PUBLIC_ROOM_NOT_FOUND', message: 'Room type is not available' });
    return toPublicRoom(room, policy);
  }

  async availability(checkIn: string, checkOut: string, guests: number) {
    const start = date(checkIn); const end = date(checkOut);
    if (end <= start || !Number.isInteger(guests) || guests < 1) throw invalidQuery();
    const [rooms, policy] = await Promise.all([this.prisma.roomType.findMany({
      where: {
        status: 'ACTIVE', deletedAt: null, maxTotalGuests: { gte: guests },
        rooms: { some: { status: 'ACTIVE', deletedAt: null, blocks: { none: { cancelledAt: null, startDate: { lt: end }, endDate: { gt: start } } }, occupancies: { none: { stayDate: { gte: start, lt: end } } } } },
      },
      select: publicRoomSelect, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }), this.commercialPolicy()]);
    return { items: rooms.map((room) => toPublicRoom(room, policy)) };
  }

  async quote(slug: string, dateFrom: string, dateTo: string, adults: number, children: number) {
    const [room, policy] = await Promise.all([
      this.prisma.roomType.findFirst({ where: { slug, status: 'ACTIVE', deletedAt: null }, select: { id: true } }),
      this.commercialPolicy(),
    ]);
    if (!room) throw new NotFoundException({ code: 'PUBLIC_ROOM_NOT_FOUND', message: 'Room type is not available' });
    const quote = await this.pricing.quote(room.id, dateFrom, dateTo, adults, children);
    return {
      currency: 'VND', nights: quote.nights, nightlySubtotal: Number(quote.nightlySubtotal),
      extraGuestSubtotal: Number(quote.extraGuestSubtotal), total: Number(quote.total), isSandbox: false,
      pricesIncludeVat: policy.pricesIncludeVat, extraMattress: policy.extraMattress,
    };
  }

  private async commercialPolicy(): Promise<CommercialPolicy> {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: PRODUCTION_CATALOG_SETTING_KEY }, select: { value: true } });
    const value = jsonObject(setting?.value);
    const mattress = jsonObject(value?.['extraMattress']);
    if (
      value?.['version'] !== PRODUCTION_CATALOG_VERSION || value['pricesIncludeVat'] !== false ||
      !positiveInteger(mattress?.['maxPerRoom']) || !positiveInteger(mattress?.['guestCapacityPerMattress']) ||
      !positiveInteger(mattress?.['price']) || mattress?.['currency'] !== 'VND'
    ) {
      throw new ServiceUnavailableException({ code: 'ROOM_CATALOG_NOT_READY', message: 'Production room catalog is not ready' });
    }
    return {
      pricesIncludeVat: false,
      extraMattress: {
        maxPerRoom: mattress['maxPerRoom'] as number,
        guestCapacityPerMattress: mattress['guestCapacityPerMattress'] as number,
        price: mattress['price'] as number,
        currency: 'VND',
      },
    };
  }
}

function toPublicRoom(room: PublicRoomRecord, policy: CommercialPolicy) {
  return {
    name: room.name, slug: room.slug, shortDescription: room.shortDescription, description: room.description,
    capacity: { standardAdults: room.standardAdults, maxAdults: room.maxAdults, maxChildren: room.maxChildren, maxTotalGuests: room.maxTotalGuests },
    bedConfiguration: room.bedConfiguration, amenities: room.amenities, isSandbox: false,
    pricesIncludeVat: policy.pricesIncludeVat, extraMattress: policy.extraMattress,
  };
}

function date(value: string): Date {
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime())) throw invalidQuery();
  return result;
}

function invalidQuery(): BadRequestException { return new BadRequestException({ code: 'INVALID_PUBLIC_ROOM_QUERY', message: 'Room search input is invalid' }); }
function jsonObject(value: unknown): Record<string, unknown> | null { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function positiveInteger(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value > 0; }
