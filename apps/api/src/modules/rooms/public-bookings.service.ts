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
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BookingPolicyService } from './booking-policy.service';
import type { CreatePublicRoomBookingDto } from './dto/create-public-room-booking.dto';

const IDEMPOTENCY_SCOPE = 'public.room.checkout';
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export interface PublicCheckoutActor { correlationId?: string; ipAddress?: string; userAgent?: string; }

@Injectable()
export class PublicBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PriceEngineService,
    private readonly payments: PaymentsService,
    private readonly policy: BookingPolicyService,
  ) {}

  async create(dto: CreatePublicRoomBookingDto, idempotencyKey: string, actor: PublicCheckoutActor) {
    const key = idempotencyKey.trim();
    if (!key || key.length > 180) throw invalid();
    const normalized = normalizedRequest(dto);
    const requestHash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    const start = day(dto.checkIn); const end = day(dto.checkOut); const createdAt = new Date();
    if (end <= start || dto.children + dto.adults > 20 || dto.fullName.trim().length < 2 || dto.bookingPolicyAccepted !== true || dto.privacyPolicyAccepted !== true) throw invalid();
    if (dto.checkIn < operationalDate(createdAt)) throw invalid();
    const phone = normalizeVietnamesePhone(dto.phone);
    if (!phone) throw invalid();
    const email = dto.email?.trim().toLowerCase() || null;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const previous = await tx.idempotencyKey.findUnique({ where: { key } });
        if (previous) {
          if (previous.scope !== IDEMPOTENCY_SCOPE || previous.requestHash !== requestHash || !previous.responseBody) throw idempotencyConflict();
          return previous.responseBody;
        }

        const roomType = await tx.roomType.findFirst({
          where: { slug: dto.roomSlug, status: 'ACTIVE', deletedAt: null },
          select: { id: true, standardAdults: true, maxAdults: true, maxChildren: true, maxTotalGuests: true },
        });
        const guestCount = dto.adults + dto.children;
        if (!roomType || dto.adults > roomType.maxAdults || dto.children > roomType.maxChildren || guestCount > roomType.maxTotalGuests) throw invalid();
        const requiredMattresses = guestCount > roomType.standardAdults ? 1 : 0;
        if (dto.extraMattressQuantity < requiredMattresses) throw mattressRequired();

        const room = await tx.room.findFirst({
          where: {
            roomTypeId: roomType.id, status: 'ACTIVE', deletedAt: null,
            blocks: { none: { cancelledAt: null, startDate: { lt: end }, endDate: { gt: start } } },
            occupancies: { none: { stayDate: { gte: start, lt: end } } },
          },
          select: { id: true }, orderBy: { code: 'asc' },
        });
        if (!room) throw unavailable();

        const rules = await tx.roomRateRule.findMany({ where: { roomTypeId: roomType.id, status: 'ACTIVE' }, orderBy: [{ priority: 'desc' }, { id: 'asc' }] });
        const quote = this.pricing.quote(rules, dto.checkIn, dto.checkOut, dto.adults, dto.children, roomType.standardAdults, dto.extraMattressQuantity);
        const deposit = this.policy.deposit(quote.total, start, quote.usesHolidayRate, createdAt);

        const customer = await tx.customer.findFirst({
          where: { deletedAt: null, OR: [{ phoneNormalized: phone }, ...(email ? [{ emailNormalized: email }] : [])] }, orderBy: { createdAt: 'asc' },
        }) ?? await tx.customer.create({
          data: { customerCode: CustomersService.generateCode(), fullName: dto.fullName.trim(), phoneNormalized: phone, emailNormalized: email, source: 'DIRECT', privacyConsentAt: createdAt },
        });
        const booking = await tx.booking.create({
          data: {
            bookingCode: bookingCode(), customerId: customer.id, checkInDate: start, checkOutDate: end,
            adults: dto.adults, children: dto.children, status: 'PENDING_PAYMENT', source: 'DIRECT', totalAmount: quote.total,
            depositRequiredAmount: deposit.amount, depositPolicy: deposit.policy,
            specialRequest: dto.specialRequest?.trim() || null, expectedArrivalTime: dto.expectedArrivalTime?.trim() || null,
          },
        });
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            lastBookingAt: createdAt,
            privacyConsentAt: createdAt,
            ...(!customer.firstBookingAt ? { firstBookingAt: createdAt } : {}),
          },
        });
        await tx.bookingRoom.create({
          data: {
            bookingId: booking.id, roomId: room.id, roomTypeId: roomType.id, amount: quote.total,
            adults: dto.adults, children: dto.children, extraMattressQuantity: dto.extraMattressQuantity,
            nightlyRateSnapshot: priceSnapshot(quote, deposit),
          },
        });
        await tx.roomOccupancy.createMany({ data: stayDates(start, end).map((stayDate) => ({ roomId: room.id, bookingId: booking.id, stayDate, status: 'HOLD' })) });
        const hold = await tx.resourceHold.create({
          data: {
            resourceType: 'ROOM', resourceId: room.id, referenceType: 'BOOKING', referenceId: booking.id,
            startAt: start, endAt: end, expiresAt: this.policy.holdExpiresAt(createdAt), status: 'ACTIVE', idempotencyKey: `booking:${key}`,
          },
        });
        await tx.bookingStatusHistory.create({ data: { bookingId: booking.id, toStatus: 'PENDING_PAYMENT', reason: 'public production checkout' } });
        const payment = await this.payments.createIntentForRoomCheckout(tx, booking, hold, { staffProfileId: '', correlationId: actor.correlationId, ipAddress: actor.ipAddress, userAgent: actor.userAgent });
        const response = {
          bookingCode: booking.bookingCode, status: 'PENDING_PAYMENT', paymentReference: payment.paymentIntentId,
          totalAmount: quote.total.toString(), depositRequiredAmount: deposit.amount.toString(), depositPolicy: deposit.policy,
          holdExpiresAt: hold.expiresAt.toISOString(), currency: booking.currency,
        };
        await tx.idempotencyKey.create({ data: { key, scope: IDEMPOTENCY_SCOPE, requestHash, responseStatus: 201, responseBody: response, expiresAt: new Date(createdAt.getTime() + IDEMPOTENCY_TTL_MS) } });
        await tx.auditLog.create({ data: bookingAudit(booking.id, response, actor) });
        await tx.outboxEvent.create({ data: { aggregateType: 'BOOKING', aggregateId: booking.id, eventType: 'booking.created', payload: { bookingId: booking.id, bookingCode: booking.bookingCode, holdExpiresAt: response.holdExpiresAt } } });
        return response;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        if (isIdempotencyTarget(error.meta?.['target'])) throw idempotencyConflict();
        throw unavailable();
      }
      throw error;
    }
  }
}

function normalizedRequest(dto: CreatePublicRoomBookingDto) {
  return {
    roomSlug: dto.roomSlug, checkIn: dto.checkIn, checkOut: dto.checkOut, fullName: dto.fullName.trim(),
    phone: dto.phone.replace(/[\s.-]/g, ''), email: dto.email?.trim().toLowerCase() || null,
    adults: dto.adults, children: dto.children, extraMattressQuantity: dto.extraMattressQuantity,
    specialRequest: dto.specialRequest?.trim() || null, expectedArrivalTime: dto.expectedArrivalTime?.trim() || null,
    bookingPolicyAccepted: dto.bookingPolicyAccepted, privacyPolicyAccepted: dto.privacyPolicyAccepted,
  };
}
function priceSnapshot(quote: ReturnType<PriceEngineService['quote']>, deposit: ReturnType<BookingPolicyService['deposit']>): Prisma.InputJsonValue {
  return {
    version: 1, nights: quote.nights, nightlySubtotal: quote.nightlySubtotal.toString(), extraGuestSubtotal: quote.extraGuestSubtotal.toString(), total: quote.total.toString(),
    deposit: { amount: deposit.amount.toString(), percent: deposit.percent, policy: deposit.policy },
    nightlyBreakdown: quote.nightlyBreakdown.map((night) => ({ ...night, baseAmount: night.baseAmount.toString(), extraMattressAmount: night.extraMattressAmount.toString(), extraChildAmount: night.extraChildAmount.toString(), total: night.total.toString() })),
  };
}
function bookingAudit(bookingId: string, afterData: Record<string, unknown>, actor: PublicCheckoutActor) {
  return { actorType: 'PUBLIC', actorId: null, action: 'booking.created', resourceType: 'booking', resourceId: bookingId, afterData: afterData as Prisma.InputJsonValue, ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent?.slice(0, 500) ?? null, correlationId: actor.correlationId ?? null };
}
function day(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalid(); const result = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value) throw invalid(); return result; }
function stayDates(start: Date, end: Date) { const dates: Date[] = []; for (let value = new Date(start); value < end; value = new Date(value.getTime() + 86_400_000)) dates.push(value); return dates; }
function operationalDate(instant: Date) { return new Date(instant.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10); }
function normalizeVietnamesePhone(value: string) { const compact = value.replace(/[\s.-]/g, ''); const match = compact.match(/^(?:\+84|84|0)([35789]\d{8})$/); return match ? `+84${match[1]}` : null; }
function bookingCode() { return `VMD-BK-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`; }
function isIdempotencyTarget(target: unknown) { return Array.isArray(target) ? target.includes('key') : typeof target === 'string' && target.includes('idempotency'); }
function invalid() { return new BadRequestException({ code: 'INVALID_PUBLIC_ROOM_BOOKING', message: 'Booking details are invalid' }); }
function mattressRequired() { return new BadRequestException({ code: 'EXTRA_MATTRESS_REQUIRED', message: 'An extra mattress is required for this guest count' }); }
function unavailable() { return new ConflictException({ code: 'ROOM_UNAVAILABLE', message: 'The selected room is no longer available' }); }
function idempotencyConflict() { return new ConflictException({ code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key conflicts with an existing request' }); }
