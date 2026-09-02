import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PriceEngineService } from './price-engine.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BookingStateService } from './booking-state.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { CancellationPolicyService, type CancellationPolicy } from './cancellation-policy.service';

interface DateChangeRequest {
  id: string;
  bookingId: string;
  requestedData: Prisma.JsonValue;
}

export interface DateChangeExecution {
  previousTotalAmount: bigint;
  recalculatedTotalAmount: bigint;
  chargedTotalAmount: bigint;
  additionalAmountDue: bigint;
  previousCheckIn: string;
  previousCheckOut: string;
  newCheckIn: string;
  newCheckOut: string;
}

@Injectable()
export class BookingDateChangeService {
  constructor(
    private readonly pricing: PriceEngineService,
    private readonly bookingState: BookingStateService,
    private readonly cancellationPolicy: CancellationPolicyService,
  ) {}

  async executeInTransaction(
    tx: Prisma.TransactionClient,
    request: DateChangeRequest,
    policy: CancellationPolicy,
    actorId: string,
    correlationId: string | undefined,
    now: Date,
  ): Promise<DateChangeExecution> {
    const requested = requestedDates(request.requestedData);
    const booking = await tx.booking.findUnique({
      where: { id: request.bookingId },
      select: {
        id: true, status: true, checkInDate: true, checkOutDate: true, originalCheckInDate: true,
        originalCheckOutDate: true, adults: true, children: true, totalAmount: true,
        depositRequiredAmount: true, dateChangeCount: true,
        rooms: { select: { id: true, roomId: true, roomTypeId: true, extraMattressQuantity: true } },
      },
    });
    if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    if (booking.status !== 'CONFIRMED') throw new BadRequestException({ code: 'DATE_CHANGE_BOOKING_INVALID_STATUS', message: 'Only a confirmed booking can be rescheduled' });
    if (booking.dateChangeCount >= 1) throw manualContact();
    if (booking.rooms.length !== 1) throw new BadRequestException({ code: 'DATE_CHANGE_MANUAL_REVIEW_REQUIRED', message: 'This booking requires manual rescheduling' });
    if (booking.checkInDate.getTime() === requested.checkIn.getTime() && booking.checkOutDate.getTime() === requested.checkOut.getTime()) {
      throw new BadRequestException({ code: 'DATE_CHANGE_UNCHANGED', message: 'The requested stay dates are unchanged' });
    }

    const originalCheckIn = booking.originalCheckInDate ?? booking.checkInDate;
    const eligibility = this.cancellationPolicy.checkDateChange({
      policy, checkInAt: booking.checkInDate, newCheckInAt: requested.checkIn,
      originalCheckInAt: originalCheckIn, dateChangeUsed: booking.dateChangeCount > 0, now,
    });
    if (!eligibility.allowed) throw new BadRequestException({ code: eligibility.reason, message: 'The requested date change is not allowed by policy' });

    const bookingRoom = booking.rooms[0]!;
    const roomType = await tx.roomType.findFirst({
      where: { id: bookingRoom.roomTypeId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, standardAdults: true, maxAdults: true, maxChildren: true, maxTotalGuests: true },
    });
    if (!roomType || booking.adults > roomType.maxAdults || booking.children > roomType.maxChildren || booking.adults + booking.children > roomType.maxTotalGuests) {
      throw new BadRequestException({ code: 'DATE_CHANGE_ROOM_TYPE_UNAVAILABLE', message: 'The booked room type is no longer available' });
    }

    const room = await tx.room.findFirst({
      where: {
        roomTypeId: roomType.id, status: 'ACTIVE', deletedAt: null,
        blocks: { none: { cancelledAt: null, startDate: { lt: requested.checkOut }, endDate: { gt: requested.checkIn } } },
        occupancies: { none: { bookingId: { not: booking.id }, stayDate: { gte: requested.checkIn, lt: requested.checkOut } } },
      },
      select: { id: true }, orderBy: { code: 'asc' },
    });
    if (!room) throw dateUnavailable();

    const rules = await tx.roomRateRule.findMany({ where: { roomTypeId: roomType.id, status: 'ACTIVE' }, orderBy: [{ priority: 'desc' }, { id: 'asc' }] });
    const quote = this.pricing.quote(rules, requested.checkInLabel, requested.checkOutLabel, booking.adults, booking.children, roomType.standardAdults, bookingRoom.extraMattressQuantity);
    const additionalAmountDue = this.cancellationPolicy.dateChangeDifference(booking.totalAmount, quote.total);
    const chargedTotalAmount = booking.totalAmount + additionalAmountDue;
    const nextDepositRequired = bigintMin(chargedTotalAmount, booking.depositRequiredAmount + additionalAmountDue);

    try {
      await this.bookingState.transitionInTransaction(tx, booking.id, 'MODIFIED', `date change request ${request.id}`);
      await tx.roomOccupancy.deleteMany({ where: { bookingId: booking.id } });
      await tx.roomOccupancy.createMany({ data: stayDates(requested.checkIn, requested.checkOut).map((stayDate) => ({ roomId: room.id, bookingId: booking.id, stayDate, status: 'CONFIRMED' })) });
      await tx.bookingRoom.update({
        where: { id: bookingRoom.id },
        data: {
          roomId: room.id, amount: chargedTotalAmount,
          nightlyRateSnapshot: dateChangeSnapshot(quote, booking.totalAmount, chargedTotalAmount, additionalAmountDue, requested),
        },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          checkInDate: requested.checkIn, checkOutDate: requested.checkOut,
          originalCheckInDate: originalCheckIn,
          originalCheckOutDate: booking.originalCheckOutDate ?? booking.checkOutDate,
          dateChangeCount: 1, totalAmount: chargedTotalAmount, depositRequiredAmount: nextDepositRequired,
        },
      });
      await tx.resourceHold.updateMany({
        where: { referenceType: 'BOOKING', referenceId: booking.id, status: 'CONFIRMED' },
        data: { resourceId: room.id, startAt: requested.checkIn, endAt: requested.checkOut },
      });
      await tx.notificationJob.updateMany({
        where: { recipientReferenceId: booking.id, templateCode: { startsWith: 'BOOKING_REMINDER_' }, status: { in: ['pending', 'processing'] } },
        data: { status: 'cancelled', completedAt: now, lastError: 'Booking rescheduled; stale reminder cancelled' },
      });
      await this.bookingState.transitionInTransaction(tx, booking.id, 'CONFIRMED', `date change request ${request.id} applied`);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw dateUnavailable();
      throw error;
    }

    const result: DateChangeExecution = {
      previousTotalAmount: booking.totalAmount, recalculatedTotalAmount: quote.total,
      chargedTotalAmount, additionalAmountDue,
      previousCheckIn: label(booking.checkInDate), previousCheckOut: label(booking.checkOutDate),
      newCheckIn: requested.checkInLabel, newCheckOut: requested.checkOutLabel,
    };
    await tx.auditLog.create({
      data: {
        actorType: 'STAFF', actorId, action: 'booking.rescheduled', resourceType: 'booking', resourceId: booking.id,
        beforeData: { checkIn: result.previousCheckIn, checkOut: result.previousCheckOut, totalAmount: result.previousTotalAmount.toString(), roomId: bookingRoom.roomId },
        afterData: { checkIn: result.newCheckIn, checkOut: result.newCheckOut, recalculatedTotalAmount: result.recalculatedTotalAmount.toString(), chargedTotalAmount: result.chargedTotalAmount.toString(), additionalAmountDue: result.additionalAmountDue.toString(), roomId: room.id, dateChangeCount: 1 },
        reason: `Approved guest date-change request ${request.id}`, correlationId: correlationId ?? null,
      },
    });
    await tx.outboxEvent.create({
      data: {
        aggregateType: 'BOOKING', aggregateId: booking.id, eventType: 'booking.modified',
        payload: { bookingId: booking.id, requestId: request.id, checkIn: result.newCheckIn, checkOut: result.newCheckOut, additionalAmountDue: result.additionalAmountDue.toString() },
      },
    });
    return result;
  }
}

function requestedDates(value: Prisma.JsonValue) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidRequestedDates();
  const checkInLabel = value['checkIn']; const checkOutLabel = value['checkOut'];
  if (typeof checkInLabel !== 'string' || typeof checkOutLabel !== 'string') throw invalidRequestedDates();
  const checkIn = date(checkInLabel); const checkOut = date(checkOutLabel);
  if (checkOut <= checkIn) throw invalidRequestedDates();
  return { checkIn, checkOut, checkInLabel, checkOutLabel };
}
function date(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalidRequestedDates(); const result = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(result.getTime()) || label(result) !== value) throw invalidRequestedDates(); return result; }
function label(value: Date) { return value.toISOString().slice(0, 10); }
function stayDates(start: Date, end: Date) { const values: Date[] = []; for (let current = new Date(start); current < end; current = new Date(current.getTime() + 86_400_000)) values.push(current); return values; }
function dateChangeSnapshot(quote: ReturnType<PriceEngineService['quote']>, previousTotal: bigint, chargedTotal: bigint, additionalAmountDue: bigint, requested: ReturnType<typeof requestedDates>): Prisma.InputJsonValue {
  return {
    version: 2, changeType: 'DATE_CHANGE', checkIn: requested.checkInLabel, checkOut: requested.checkOutLabel,
    calculatedTotal: quote.total.toString(), previousTotal: previousTotal.toString(), chargedTotal: chargedTotal.toString(), additionalAmountDue: additionalAmountDue.toString(),
    nightlyBreakdown: quote.nightlyBreakdown.map((night) => ({ ...night, baseAmount: night.baseAmount.toString(), extraMattressAmount: night.extraMattressAmount.toString(), extraChildAmount: night.extraChildAmount.toString(), total: night.total.toString() })),
  };
}
function bigintMin(left: bigint, right: bigint) { return left < right ? left : right; }
function invalidRequestedDates() { return new BadRequestException({ code: 'INVALID_DATE_CHANGE_REQUEST', message: 'Requested dates are invalid' }); }
function dateUnavailable() { return new ConflictException({ code: 'DATE_CHANGE_ROOM_UNAVAILABLE', message: 'No room is available for the requested dates' }); }
function manualContact() { return new BadRequestException({ code: 'DATE_CHANGE_MANUAL_CONTACT_REQUIRED', message: 'This booking has already used its automatic date change; contact the homestay' }); }
