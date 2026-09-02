import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BookingStateService } from './booking-state.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BookingLookupRateLimitService } from './booking-lookup-rate-limit.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { CancellationPolicyService, type CancellationPolicy } from './cancellation-policy.service';
import type { AuthenticatedActor } from '../auth/auth.types';
import type { CreateGuestRequestDto } from './dto/booking-lookup.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BookingDateChangeService, type DateChangeExecution } from './booking-date-change.service';

const NOT_FOUND = () => new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking was not found' });
/** Asia/Ho_Chi_Minh is UTC+7 with no DST; a fixed offset is exact and matches every other operational-date computation in this project. */
const HO_CHI_MINH_OFFSET_MS = 7 * 60 * 60 * 1000;

@Injectable()
export class BookingLookupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: BookingLookupRateLimitService,
    private readonly bookingState: BookingStateService,
    private readonly cancellationPolicy: CancellationPolicyService,
    private readonly dateChanges: BookingDateChangeService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async lookup(code: string, phoneInput: string, ip: string) {
    this.rateLimit.assertAllowed(ip);
    const booking = await this.findMatching(code, phoneInput);
    if (!booking) { this.rateLimit.recordFailure(ip); throw NOT_FOUND(); }
    this.rateLimit.reset(ip);
    return this.safe(booking);
  }

  async createGuestRequest(code: string, phoneInput: string, dto: CreateGuestRequestDto, ip: string, actor: { correlationId?: string; userAgent?: string }) {
    this.rateLimit.assertAllowed(ip);
    const booking = await this.findMatching(code, phoneInput);
    if (!booking) { this.rateLimit.recordFailure(ip); throw NOT_FOUND(); }
    this.rateLimit.reset(ip);
    if (booking.status !== 'CONFIRMED' || booking.checkInDate.toISOString().slice(0, 10) <= operationalDay(this.now())) throw new BadRequestException({ code: 'BOOKING_REQUEST_NOT_ALLOWED', message: 'This booking cannot accept a request' });
    if (dto.requestType === 'DATE_CHANGE') {
      if (booking.dateChangeCount >= 1) throw manualDateChangeContact();
      if (!validDateRange(dto.requestedCheckIn, dto.requestedCheckOut)) throw new BadRequestException({ code: 'INVALID_DATE_CHANGE_REQUEST', message: 'Requested dates are invalid' });
    }
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.bookingGuestRequest.findFirst({ where: { bookingId: booking.id, status: { in: ['PENDING_REVIEW', 'REVIEWED'] } }, select: { id: true } });
      if (existing) throw new BadRequestException({ code: 'BOOKING_REQUEST_ALREADY_OPEN', message: 'A request is already open' });
      const request = await tx.bookingGuestRequest.create({ data: { bookingId: booking.id, requestType: dto.requestType, requestedData: dto.requestType === 'DATE_CHANGE' ? { checkIn: dto.requestedCheckIn, checkOut: dto.requestedCheckOut } : {}, guestNote: dto.note?.trim() || null } });
      await tx.auditLog.create({ data: audit('booking.guest_request.created', request.id, { bookingId: booking.id, requestType: request.requestType }, null, actor.correlationId) });
      await tx.outboxEvent.create({ data: { aggregateType: 'BOOKING_GUEST_REQUEST', aggregateId: request.id, eventType: 'booking.guest_request.created', payload: { bookingId: booking.id, requestId: request.id, requestType: request.requestType } } });
      return { requestId: request.id, status: request.status };
    });
  }

  async printable(code: string, phoneInput: string, ip: string) {
    const result = await this.lookup(code, phoneInput, ip);
    if (!['CONFIRMED', 'PAID'].includes(result.status)) throw NOT_FOUND();
    return result;
  }

  async review(requestId: string, note: string | undefined, actor: AuthenticatedActor, correlationId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.bookingGuestRequest.findUnique({ where: { id: requestId } });
      if (!request || !['PENDING_REVIEW', 'REVIEWED'].includes(request.status)) throw NOT_FOUND();
      const updated = await tx.bookingGuestRequest.update({ where: { id: request.id }, data: { status: 'REVIEWED', receptionNote: note?.trim() || request.receptionNote, reviewedBy: actor.staffProfileId, reviewedAt: this.now() } });
      await tx.auditLog.create({ data: audit('booking.guest_request.reviewed', request.id, { bookingId: request.bookingId, status: updated.status }, actor.staffProfileId, correlationId) });
      return { requestId: updated.id, status: updated.status };
    });
  }

  /**
   * Only a Manager (or Super Admin) may decide a guest request — approved
   * 2026-08-19 (docs/09_MILESTONE_0_INPUT_PACK.md §8, line 418). Approving a
   * CANCELLATION also computes and records the refund via
   * CancellationPolicyService (pure calculation; no money moves here — see
   * that service's header) and reports whether the refund SLA was met: "trong
   * ngày sử dụng dịch vụ" (§8 line 419) means the deadline is the booking's
   * own check-in date, not the day the guest filed the request.
   */
  async decide(requestId: string, decision: 'APPROVED' | 'REJECTED', note: string | undefined, policy: CancellationPolicy | undefined, actor: AuthenticatedActor, correlationId?: string) {
    if (!actor.roles.includes('MANAGER') && !actor.roles.includes('SUPER_ADMIN')) throw new ForbiddenException({ code: 'MANAGER_APPROVAL_REQUIRED', message: 'Manager approval is required' });
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.bookingGuestRequest.findUnique({ where: { id: requestId } });
      if (!request || !['PENDING_REVIEW', 'REVIEWED'].includes(request.status)) throw NOT_FOUND();

      const decidedAt = this.now();
      const claimed = await tx.bookingGuestRequest.updateMany({
        where: { id: request.id, status: { in: ['PENDING_REVIEW', 'REVIEWED'] } },
        data: { status: decision, decidedBy: actor.staffProfileId, decidedAt, decisionNote: note?.trim() || null },
      });
      if (claimed.count !== 1) throw NOT_FOUND();

      let refund: ReturnType<CancellationPolicyService['quote']> | null = null;
      let dateChange: DateChangeExecution | null = null;
      let slaMet: boolean | null = null;
      const isCancellationApproval = decision === 'APPROVED' && request.requestType === 'CANCELLATION';
      const isDateChangeApproval = decision === 'APPROVED' && request.requestType === 'DATE_CHANGE';
      if ((isCancellationApproval || isDateChangeApproval) && !policy) throw new BadRequestException({ code: 'BOOKING_POLICY_REQUIRED', message: 'A STANDARD or HOLIDAY policy is required to approve this request' });
      if (isCancellationApproval) {
        const booking = await tx.booking.findUnique({ where: { id: request.bookingId }, select: { checkInDate: true, dateChangeCount: true, paymentIntents: { where: { status: 'PAID' }, select: { paidAmount: true } } } });
        if (!booking) throw NOT_FOUND();
        const amountPaid = booking.paymentIntents.reduce((sum, intent) => sum + intent.paidAmount, 0n);
        refund = this.cancellationPolicy.quote({ policy: policy!, checkInAt: booking.checkInDate, amountPaid, dateChangeUsed: booking.dateChangeCount > 0, now: decidedAt });
        slaMet = operationalDay(decidedAt) <= operationalDay(booking.checkInDate);
        await this.bookingState.transitionInTransaction(tx, request.bookingId, 'CANCELLED', `guest cancellation request ${request.id}`);
      }
      if (isDateChangeApproval) {
        dateChange = await this.dateChanges.executeInTransaction(tx, request, policy!, actor.staffProfileId, correlationId, decidedAt);
      }

      const updated = await tx.bookingGuestRequest.update({
        where: { id: request.id },
        data: {
          ...(refund ? { refundPolicy: policy, refundTierCode: refund.tierCode, refundPercent: refund.refundPercent, refundAmount: refund.refundAmount, forfeitedAmount: refund.forfeitedAmount } : {}),
          ...(dateChange ? {
            previousTotalAmount: dateChange.previousTotalAmount,
            recalculatedTotalAmount: dateChange.recalculatedTotalAmount,
            chargedTotalAmount: dateChange.chargedTotalAmount,
            additionalAmountDue: dateChange.additionalAmountDue,
            requestedData: { ...(request.requestedData as Prisma.JsonObject), execution: dateChangeAmounts(dateChange) },
          } : {}),
        },
      });

      await tx.auditLog.create({ data: audit(`booking.guest_request.${decision.toLowerCase()}`, request.id, { bookingId: request.bookingId, status: decision, ...(refund ? { slaMet, refundPolicy: policy, refundAmount: refund.refundAmount.toString() } : {}), ...(dateChange ? dateChangeAmounts(dateChange) : {}) }, actor.staffProfileId, correlationId) });
      await tx.outboxEvent.create({ data: { aggregateType: 'BOOKING_GUEST_REQUEST', aggregateId: request.id, eventType: `booking.guest_request.${decision.toLowerCase()}`, payload: { bookingId: request.bookingId, requestId: request.id, status: decision } } });

      return {
        requestId: updated.id,
        status: updated.status,
        slaMet,
        refund: refund ? { policy, tierCode: refund.tierCode, refundPercent: refund.refundPercent, refundAmount: refund.refundAmount.toString(), forfeitedAmount: refund.forfeitedAmount.toString() } : null,
        dateChange: dateChange ? dateChangeAmounts(dateChange) : null,
      };
    });
  }

  private async findMatching(code: string, phoneInput: string) {
    const phone = normalizePhone(phoneInput); if (!phone) return null;
    return this.prisma.booking.findFirst({ where: { bookingCode: code.trim().toUpperCase(), customer: { phoneNormalized: phone, deletedAt: null } }, select: { id: true, bookingCode: true, status: true, checkInDate: true, checkOutDate: true, dateChangeCount: true, adults: true, children: true, totalAmount: true, specialRequest: true, createdAt: true, customer: { select: { phoneNormalized: true, emailNormalized: true } }, rooms: { select: { roomType: { select: { name: true } } } }, paymentIntents: { orderBy: { createdAt: 'desc' }, select: { id: true, status: true, amount: true, paidAmount: true, expiresAt: true } } } });
  }

  private safe(booking: NonNullable<Awaited<ReturnType<BookingLookupService['findMatching']>>>) {
    const paid = booking.paymentIntents.reduce((sum, intent) => sum + intent.paidAmount, 0n);
    const pending = booking.paymentIntents.find((intent) => intent.status === 'PENDING' && intent.expiresAt > this.now());
    const roomTypes = Object.entries(booking.rooms.reduce<Record<string, number>>((result, room) => ({ ...result, [room.roomType.name]: (result[room.roomType.name] ?? 0) + 1 }), {})).map(([name, quantity]) => ({ name, quantity }));
    return { bookingCode: booking.bookingCode, status: booking.status, roomTypes, checkIn: booking.checkInDate.toISOString().slice(0, 10), checkOut: booking.checkOutDate.toISOString().slice(0, 10), nights: Math.round((booking.checkOutDate.getTime() - booking.checkInDate.getTime()) / 86_400_000), guests: { adults: booking.adults, children: booking.children }, totalAmount: booking.totalAmount.toString(), paidAmount: paid.toString(), remainingAmount: (booking.totalAmount - paid).toString(), currency: 'VND', payment: pending ? { reference: pending.id, expiresAt: pending.expiresAt.toISOString() } : null, specialRequest: booking.specialRequest, createdAt: booking.createdAt.toISOString(), phone: maskPhone(booking.customer.phoneNormalized), email: maskEmail(booking.customer.emailNormalized) };
  }
}

/**
 * The Asia/Ho_Chi_Minh calendar date a real UTC instant falls on, as a
 * lexicographically-sortable `YYYY-MM-DD` string. `checkInDate` is already a
 * date-only column written as the literal UTC-midnight label for that local
 * date (the same convention BBQ reservation times and every other
 * operational-date field in this project use) — running it through this same
 * function is safe and a no-op, since +7h from UTC midnight never crosses a
 * day boundary.
 */
function operationalDay(instant: Date): string {
  return new Date(instant.getTime() + HO_CHI_MINH_OFFSET_MS).toISOString().slice(0, 10);
}
function normalizePhone(value: string) { const match = value.replace(/[\s.-]/g, '').match(/^(?:\+84|84|0)([35789]\d{8})$/); return match ? `+84${match[1]}` : null; }
function maskPhone(value: string | null) { return value ? `****${value.slice(-4)}` : null; }
function maskEmail(value: string | null) { if (!value) return null; const [local = '', domain = ''] = value.split('@'); return `${local.slice(0, 3)}***@${domain}`; }
function audit(action: string, resourceId: string, afterData: Record<string, unknown>, actorId: string | null, correlationId?: string) { return { actorType: actorId ? 'STAFF' : 'PUBLIC', actorId, action, resourceType: 'BOOKING_GUEST_REQUEST', resourceId, afterData: afterData as Prisma.InputJsonValue, correlationId: correlationId ?? null }; }
function validDateRange(checkIn: string | undefined, checkOut: string | undefined) { if (!checkIn || !checkOut || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) return false; const start = new Date(`${checkIn}T00:00:00.000Z`); const end = new Date(`${checkOut}T00:00:00.000Z`); return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start.toISOString().slice(0, 10) === checkIn && end.toISOString().slice(0, 10) === checkOut && end > start; }
function manualDateChangeContact() { return new BadRequestException({ code: 'DATE_CHANGE_MANUAL_CONTACT_REQUIRED', message: 'This booking has already used its automatic date change; contact the homestay' }); }
function dateChangeAmounts(value: DateChangeExecution) { return { previousTotalAmount: value.previousTotalAmount.toString(), recalculatedTotalAmount: value.recalculatedTotalAmount.toString(), chargedTotalAmount: value.chargedTotalAmount.toString(), additionalAmountDue: value.additionalAmountDue.toString(), previousCheckIn: value.previousCheckIn, previousCheckOut: value.previousCheckOut, newCheckIn: value.newCheckIn, newCheckOut: value.newCheckOut }; }
