import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PaymentsService } from '../payments/payments.service';
import { CustomersService } from '../customers/customers.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PriceEngineService } from './price-engine.service';
import type { CreatePublicRoomBookingDto } from './dto/create-public-room-booking.dto';

export interface PublicCheckoutActor { correlationId?: string; ipAddress?: string; userAgent?: string; }

@Injectable()
export class PublicBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PriceEngineService,
    private readonly payments: PaymentsService,
  ) {}

  async create(dto: CreatePublicRoomBookingDto, idempotencyKey: string, actor: PublicCheckoutActor) {
    const key = idempotencyKey.trim();
    if (!key || key.length > 180) throw invalid();
    const requestHash = createHash('sha256').update(JSON.stringify(dto)).digest('hex');
    const start = day(dto.checkIn); const end = day(dto.checkOut);
    if (end <= start || dto.children + dto.adults > 20) throw invalid();
    const phone = normalizeVietnamesePhone(dto.phone);
    if (!phone) throw invalid();
    const email = dto.email?.trim().toLowerCase() || null;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const previous = await tx.idempotencyKey.findUnique({ where: { key } });
        if (previous?.responseBody) return previous.responseBody;
        const roomType = await tx.roomType.findFirst({ where: { slug: dto.roomSlug, status: 'ACTIVE', deletedAt: null }, select: { id: true, maxAdults: true, maxChildren: true, maxTotalGuests: true } });
        if (!roomType || dto.adults > roomType.maxAdults || dto.children > roomType.maxChildren || dto.adults + dto.children > roomType.maxTotalGuests) throw invalid();
        const room = await tx.room.findFirst({
          where: { roomTypeId: roomType.id, status: 'ACTIVE', deletedAt: null, blocks: { none: { cancelledAt: null, startDate: { lt: end }, endDate: { gt: start } } }, occupancies: { none: { stayDate: { gte: start, lt: end } } } },
          select: { id: true }, orderBy: { code: 'asc' },
        });
        if (!room) throw unavailable();
        const rules = await tx.roomRateRule.findMany({ where: { roomTypeId: roomType.id, status: 'ACTIVE' }, orderBy: [{ priority: 'desc' }, { id: 'asc' }] });
        const quote = this.pricing.quote(rules, dto.checkIn, dto.checkOut, dto.adults, dto.children);
        const customer = await tx.customer.findFirst({ where: { deletedAt: null, OR: [{ phoneNormalized: phone }, ...(email ? [{ emailNormalized: email }] : [])] }, orderBy: { createdAt: 'asc' } })
          ?? await tx.customer.create({ data: { customerCode: CustomersService.generateCode(), fullName: dto.fullName.trim(), phoneNormalized: phone, emailNormalized: email, source: 'DIRECT' } });
        const booking = await tx.booking.create({ data: { bookingCode: bookingCode(), customerId: customer.id, checkInDate: start, checkOutDate: end, adults: dto.adults, children: dto.children, status: 'PENDING_PAYMENT', source: 'SYNTHETIC', totalAmount: quote.total, specialRequest: dto.specialRequest?.trim() || null, expectedArrivalTime: dto.expectedArrivalTime?.trim() || null } });
        await tx.customer.update({ where: { id: customer.id }, data: { lastBookingAt: new Date(), firstBookingAt: customer.createdAt } });
        await tx.bookingRoom.create({ data: { bookingId: booking.id, roomId: room.id, roomTypeId: roomType.id, amount: quote.total, adults: dto.adults, children: dto.children, nightlyRateSnapshot: { sandbox: true, nights: quote.nights, nightlySubtotal: quote.nightlySubtotal.toString(), extraGuestSubtotal: quote.extraGuestSubtotal.toString(), rateRuleIds: quote.appliedRuleIds } } });
        const dates = stayDates(start, end);
        await tx.roomOccupancy.createMany({ data: dates.map((stayDate) => ({ roomId: room.id, bookingId: booking.id, stayDate, status: 'HOLD' })) });
        const hold = await tx.resourceHold.create({ data: { resourceType: 'ROOM', resourceId: room.id, referenceType: 'BOOKING', referenceId: booking.id, startAt: start, endAt: end, expiresAt: new Date(Date.now() + 15 * 60_000), status: 'ACTIVE', idempotencyKey: `booking:${key}` } });
        await tx.bookingStatusHistory.create({ data: { bookingId: booking.id, toStatus: 'PENDING_PAYMENT', reason: 'public sandbox checkout' } });
        const payment = await this.payments.createSandboxIntentForCheckout(tx, booking, hold.id, { staffProfileId: '', correlationId: actor.correlationId, ipAddress: actor.ipAddress, userAgent: actor.userAgent });
        const response = { bookingCode: booking.bookingCode, status: 'PENDING_PAYMENT', paymentReference: payment.paymentIntentId };
        await tx.idempotencyKey.create({ data: { key, scope: 'public.room.checkout', requestHash, responseStatus: 201, responseBody: response, expiresAt: payment.expiresAt } });
        await tx.outboxEvent.create({ data: { aggregateType: 'BOOKING', aggregateId: booking.id, eventType: 'booking.created.public_sandbox', payload: { bookingId: booking.id, bookingCode: booking.bookingCode } } });
        return response;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw unavailable();
      throw error;
    }
  }
}

function day(value: string) { const result = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(result.getTime())) throw invalid(); return result; }
function stayDates(start: Date, end: Date) { const dates: Date[] = []; for (let value = new Date(start); value < end; value = new Date(value.getTime() + 86_400_000)) dates.push(value); return dates; }
function normalizeVietnamesePhone(value: string) { const compact = value.replace(/[\s.-]/g, ''); const match = compact.match(/^(?:\+84|84|0)([35789]\d{8})$/); return match ? `+84${match[1]}` : null; }
function bookingCode() { return `SYN-${randomUUID().slice(0, 8).toUpperCase()}`; }
function invalid() { return new BadRequestException({ code: 'INVALID_PUBLIC_ROOM_BOOKING', message: 'Booking details are invalid' }); }
function unavailable() { return new ConflictException({ code: 'ROOM_UNAVAILABLE', message: 'The selected room is no longer available' }); }
