import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BookingStateService } from './booking-state.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BookingLookupRateLimitService } from './booking-lookup-rate-limit.service';
import type { AuthenticatedActor } from '../auth/auth.types';
import type { CreateGuestRequestDto } from './dto/booking-lookup.dto';

const NOT_FOUND = () => new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking was not found' });

@Injectable()
export class BookingLookupService {
  constructor(private readonly prisma: PrismaService, private readonly rateLimit: BookingLookupRateLimitService, private readonly bookingState: BookingStateService) {}

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
    if (booking.status !== 'CONFIRMED' || booking.checkInDate <= new Date()) throw new BadRequestException({ code: 'BOOKING_REQUEST_NOT_ALLOWED', message: 'This booking cannot accept a request' });
    if (dto.requestType === 'DATE_CHANGE' && (!dto.requestedCheckIn || !dto.requestedCheckOut || dto.requestedCheckIn >= dto.requestedCheckOut)) throw new BadRequestException({ code: 'INVALID_DATE_CHANGE_REQUEST', message: 'Requested dates are invalid' });
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
      const updated = await tx.bookingGuestRequest.update({ where: { id: request.id }, data: { status: 'REVIEWED', receptionNote: note?.trim() || request.receptionNote, reviewedBy: actor.staffProfileId, reviewedAt: new Date() } });
      await tx.auditLog.create({ data: audit('booking.guest_request.reviewed', request.id, { bookingId: request.bookingId, status: updated.status }, actor.staffProfileId, correlationId) });
      return { requestId: updated.id, status: updated.status };
    });
  }

  async decide(requestId: string, decision: 'APPROVED' | 'REJECTED', note: string | undefined, actor: AuthenticatedActor, correlationId?: string) {
    if (!actor.roles.includes('MANAGER') && !actor.roles.includes('SUPER_ADMIN')) throw new ForbiddenException({ code: 'MANAGER_APPROVAL_REQUIRED', message: 'Manager approval is required' });
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.bookingGuestRequest.findUnique({ where: { id: requestId } });
      if (!request || !['PENDING_REVIEW', 'REVIEWED'].includes(request.status)) throw NOT_FOUND();
      if (decision === 'APPROVED' && request.requestType === 'CANCELLATION') await this.bookingState.transitionInTransaction(tx, request.bookingId, 'CANCELLED', `guest cancellation request ${request.id}`);
      const updated = await tx.bookingGuestRequest.update({ where: { id: request.id }, data: { status: decision, decidedBy: actor.staffProfileId, decidedAt: new Date(), decisionNote: note?.trim() || null } });
      await tx.auditLog.create({ data: audit(`booking.guest_request.${decision.toLowerCase()}`, request.id, { bookingId: request.bookingId, status: decision }, actor.staffProfileId, correlationId) });
      await tx.outboxEvent.create({ data: { aggregateType: 'BOOKING_GUEST_REQUEST', aggregateId: request.id, eventType: `booking.guest_request.${decision.toLowerCase()}`, payload: { bookingId: request.bookingId, requestId: request.id, status: decision } } });
      return { requestId: updated.id, status: updated.status };
    });
  }

  private async findMatching(code: string, phoneInput: string) {
    const phone = normalizePhone(phoneInput); if (!phone) return null;
    return this.prisma.booking.findFirst({ where: { bookingCode: code.trim().toUpperCase(), customer: { phoneNormalized: phone, deletedAt: null } }, select: { id: true, bookingCode: true, status: true, checkInDate: true, checkOutDate: true, adults: true, children: true, totalAmount: true, specialRequest: true, createdAt: true, customer: { select: { phoneNormalized: true, emailNormalized: true } }, rooms: { select: { roomType: { select: { name: true } } } }, paymentIntents: { orderBy: { createdAt: 'desc' }, select: { id: true, status: true, amount: true, paidAmount: true, expiresAt: true } } } });
  }

  private safe(booking: NonNullable<Awaited<ReturnType<BookingLookupService['findMatching']>>>) {
    const paid = booking.paymentIntents.reduce((sum, intent) => sum + intent.paidAmount, 0n);
    const pending = booking.paymentIntents.find((intent) => intent.status === 'PENDING' && intent.expiresAt > new Date());
    const roomTypes = Object.entries(booking.rooms.reduce<Record<string, number>>((result, room) => ({ ...result, [room.roomType.name]: (result[room.roomType.name] ?? 0) + 1 }), {})).map(([name, quantity]) => ({ name, quantity }));
    return { bookingCode: booking.bookingCode, status: booking.status, roomTypes, checkIn: booking.checkInDate.toISOString().slice(0, 10), checkOut: booking.checkOutDate.toISOString().slice(0, 10), nights: Math.round((booking.checkOutDate.getTime() - booking.checkInDate.getTime()) / 86_400_000), guests: { adults: booking.adults, children: booking.children }, totalAmount: booking.totalAmount.toString(), paidAmount: paid.toString(), remainingAmount: (booking.totalAmount - paid).toString(), currency: 'VND', payment: pending ? { reference: pending.id, expiresAt: pending.expiresAt.toISOString() } : null, specialRequest: booking.specialRequest, createdAt: booking.createdAt.toISOString(), phone: maskPhone(booking.customer.phoneNormalized), email: maskEmail(booking.customer.emailNormalized) };
  }
}

function normalizePhone(value: string) { const match = value.replace(/[\s.-]/g, '').match(/^(?:\+84|84|0)([35789]\d{8})$/); return match ? `+84${match[1]}` : null; }
function maskPhone(value: string | null) { return value ? `****${value.slice(-4)}` : null; }
function maskEmail(value: string | null) { if (!value) return null; const [local = '', domain = ''] = value.split('@'); return `${local.slice(0, 3)}***@${domain}`; }
function audit(action: string, resourceId: string, afterData: Record<string, unknown>, actorId: string | null, correlationId?: string) { return { actorType: actorId ? 'STAFF' : 'PUBLIC', actorId, action, resourceType: 'BOOKING_GUEST_REQUEST', resourceId, afterData: afterData as Prisma.InputJsonValue, correlationId: correlationId ?? null }; }
