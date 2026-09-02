import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

const ROOM_EXPIRY_SETTING = 'payment.expiry_hours.room';
const BBQ_EXPIRY_SETTING = 'payment.expiry_hours.bbq';
const PAYMENT_IDEMPOTENCY_SCOPE = 'payment.intent.sandbox';

export interface PaymentActor {
  staffProfileId: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}
export interface PaymentIntentResponse { paymentIntentId: string; bookingId: string | null; bbqReservationId: string | null; status: string; amount: string; currency: string; transferContent: string; qrPayload: string; expiresAt: string; createdAt: string; }
type PaymentLink = { bookingId: string } | { bbqReservationId: string };
interface PaymentReference { totalAmount: bigint; currency: string; createdAt: Date; }

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly now: () => Date = () => new Date()) {}

  async createSandboxIntent(bookingId: string, idempotencyKey: string, actor: PaymentActor): Promise<PaymentIntentResponse> {
    const normalizedKey = idempotencyKey.trim();
    if (!normalizedKey) throw invalidIntent();
    const requestHash = createHash('sha256').update(JSON.stringify({ bookingId, idempotencyKey: normalizedKey })).digest('hex');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingKey = await tx.idempotencyKey.findUnique({ where: { key: normalizedKey } });
        if (existingKey?.responseBody) return existingKey.responseBody as unknown as PaymentIntentResponse;

        const booking = await tx.booking.findUnique({ where: { id: bookingId } });
        if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
        if (booking.source !== 'SYNTHETIC' || booking.status !== 'PENDING_PAYMENT') throw invalidBooking();

        const now = this.now();
        const hold = await tx.resourceHold.findFirst({ where: { referenceType: 'BOOKING', referenceId: bookingId, status: 'ACTIVE', expiresAt: { gt: now } }, orderBy: { createdAt: 'desc' } });
        if (!hold) throw invalidBooking();
        const expiryHours = await readExpiryHours(tx.appSetting, ROOM_EXPIRY_SETTING);
        const expiresAt = new Date(now.getTime() + expiryHours * 3_600_000);

        const response = await this.createWithUniqueTransferContent(tx, { bookingId: booking.id }, booking, expiresAt, now);
        await tx.resourceHold.update({ where: { id: hold.id }, data: { expiresAt } });
        await tx.idempotencyKey.create({ data: { key: normalizedKey, scope: PAYMENT_IDEMPOTENCY_SCOPE, requestHash, responseStatus: 201, responseBody: response, expiresAt } });
        await tx.outboxEvent.create({ data: { aggregateType: 'PAYMENT_INTENT', aggregateId: response.paymentIntentId, eventType: 'payment.intent.created.sandbox', payload: response } });
        await tx.auditLog.create({ data: auditData(actor, 'payment.intent.created', response.paymentIntentId, { bookingId, status: 'PENDING', transferContent: response.transferContent }) });
        return response;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key conflicts with an existing request' });
      throw error;
    }
  }

  async getSandboxIntent(id: string) {
    const intent = await this.prisma.paymentIntent.findUnique({ where: { id }, select: { id: true, bookingId: true, bbqReservationId: true, provider: true, status: true, amount: true, paidAmount: true, currency: true, transferContent: true, qrPayload: true, expiresAt: true, createdAt: true } });
    if (!intent) throw new NotFoundException({ code: 'PAYMENT_INTENT_NOT_FOUND', message: 'Payment intent not found' });
    return intent;
  }

  /** Used by public room checkout while its booking transaction is open. PAY-007 replaces the provider/QR adapter, not this booking boundary. */
  async createIntentForRoomCheckout(
    tx: Prisma.TransactionClient,
    booking: { id: string; depositRequiredAmount: bigint; currency: string; createdAt: Date },
    hold: { id: string; expiresAt: Date },
    actor: PaymentActor,
  ): Promise<PaymentIntentResponse> {
    const now = this.now();
    if (hold.expiresAt <= now || booking.depositRequiredAmount < 0n) throw invalidBooking();
    const response = await this.createWithUniqueTransferContent(tx, { bookingId: booking.id }, { totalAmount: booking.depositRequiredAmount, currency: booking.currency, createdAt: booking.createdAt }, hold.expiresAt, now);
    await tx.outboxEvent.create({ data: { aggregateType: 'PAYMENT_INTENT', aggregateId: response.paymentIntentId, eventType: 'payment.intent.created', payload: response } });
    await tx.auditLog.create({ data: auditData(actor, 'payment.intent.created', response.paymentIntentId, { bookingId: booking.id, holdId: hold.id, status: 'PENDING', transferContent: response.transferContent, expiresAt: hold.expiresAt.toISOString() }) });
    return response;
  }

  /** Used by the public BBQ checkout while its reservation transaction is still open; amount is the deposit, not the full items total. */
  async createSandboxIntentForBbqCheckout(
    tx: Prisma.TransactionClient,
    reservation: { id: string; depositAmount: bigint; currency: string; createdAt: Date },
    holdId: string,
    actor: PaymentActor,
  ): Promise<PaymentIntentResponse> {
    const now = this.now();
    const expiryHours = await readExpiryHours(tx.appSetting, BBQ_EXPIRY_SETTING);
    const expiresAt = new Date(now.getTime() + expiryHours * 3_600_000);
    const response = await this.createWithUniqueTransferContent(tx, { bbqReservationId: reservation.id }, { totalAmount: reservation.depositAmount, currency: reservation.currency, createdAt: reservation.createdAt }, expiresAt, now);
    await tx.resourceHold.update({ where: { id: holdId }, data: { expiresAt } });
    await tx.outboxEvent.create({ data: { aggregateType: 'PAYMENT_INTENT', aggregateId: response.paymentIntentId, eventType: 'payment.intent.created.sandbox', payload: response } });
    await tx.auditLog.create({ data: auditData(actor, 'payment.intent.created', response.paymentIntentId, { bbqReservationId: reservation.id, status: 'PENDING', transferContent: response.transferContent }) });
    return response;
  }

  async expireDue() {
    const now = this.now();
    const due = await this.prisma.paymentIntent.findMany({ where: { status: 'PENDING', expiresAt: { lte: now } }, select: { id: true } });
    const results = await Promise.all(due.map(({ id }) => this.expireOne(id, now)));
    return { expired: results.filter(Boolean).length };
  }

  async expireOne(paymentIntentId: string, now = this.now()): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const intent = await tx.paymentIntent.findUnique({ where: { id: paymentIntentId } });
      if (!intent || intent.status !== 'PENDING' || intent.expiresAt > now) return false;
      const updated = await tx.paymentIntent.updateMany({ where: { id: paymentIntentId, status: 'PENDING' }, data: { status: 'EXPIRED' } });
      if (updated.count !== 1) return false;

      if (intent.bookingId) {
        const booking = await tx.booking.findUnique({ where: { id: intent.bookingId } });
        if (booking?.status === 'PENDING_PAYMENT') {
          await tx.booking.update({ where: { id: booking.id }, data: { status: 'EXPIRED' } });
          await tx.bookingStatusHistory.create({ data: { bookingId: booking.id, fromStatus: 'PENDING_PAYMENT', toStatus: 'EXPIRED', reason: 'payment intent expired' } });
          await tx.roomOccupancy.deleteMany({ where: { bookingId: booking.id } });
          await tx.resourceHold.updateMany({ where: { referenceType: 'BOOKING', referenceId: booking.id, status: 'ACTIVE' }, data: { status: 'RELEASED', releasedAt: now } });
          await tx.outboxEvent.create({ data: { aggregateType: 'BOOKING', aggregateId: booking.id, eventType: 'booking.expired.payment', payload: { bookingId: booking.id, paymentIntentId } } });
        }
      } else if (intent.bbqReservationId) {
        const reservation = await tx.bbqReservation.findUnique({ where: { id: intent.bbqReservationId } });
        if (reservation?.status === 'PENDING_PAYMENT') {
          await tx.bbqReservation.update({ where: { id: reservation.id }, data: { status: 'EXPIRED' } });
          await tx.bbqReservationStatusHistory.create({ data: { reservationId: reservation.id, fromStatus: 'PENDING_PAYMENT', toStatus: 'EXPIRED', reason: 'payment intent expired' } });
          await tx.bbqReservationTable.updateMany({ where: { reservationId: reservation.id, status: 'ACTIVE' }, data: { status: 'RELEASED' } });
          await tx.resourceHold.updateMany({ where: { referenceType: 'BBQ_RESERVATION', referenceId: reservation.id, status: 'ACTIVE' }, data: { status: 'RELEASED', releasedAt: now } });
          await tx.outboxEvent.create({ data: { aggregateType: 'BBQ_RESERVATION', aggregateId: reservation.id, eventType: 'bbq_reservation.expired.payment', payload: { reservationId: reservation.id, paymentIntentId } } });
        }
      }
      if (intent.paidAmount > 0n) await tx.reconciliationCase.create({ data: { paymentIntentId, reason: 'PARTIAL_PAYMENT_AFTER_EXPIRY', expectedAmount: intent.amount, receivedAmount: intent.paidAmount } });
      await tx.auditLog.create({ data: auditData({ staffProfileId: null, correlationId: null }, 'payment.intent.expired', paymentIntentId, { bookingId: intent.bookingId, bbqReservationId: intent.bbqReservationId, partialPayment: intent.paidAmount > 0n }) });
      return true;
    });
  }

  private async createWithUniqueTransferContent(tx: Prisma.TransactionClient, link: PaymentLink, reference: PaymentReference, expiresAt: Date, now: Date) {
    const typePrefix = 'bookingId' in link ? 'BK' : 'BBQ';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const transferContent = makeTransferContent(reference.createdAt, typePrefix);
      try {
        const intent = await tx.paymentIntent.create({ data: { ...link, amount: reference.totalAmount, currency: reference.currency, transferContent, qrPayload: makeSandboxQrPayload(transferContent, reference.totalAmount), expiresAt } });
        return { paymentIntentId: intent.id, bookingId: intent.bookingId, bbqReservationId: intent.bbqReservationId, status: intent.status, amount: intent.amount.toString(), currency: intent.currency, transferContent, qrPayload: intent.qrPayload, expiresAt: intent.expiresAt.toISOString(), createdAt: now.toISOString() };
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002' || attempt === 4) throw error;
      }
    }
    throw new ServiceUnavailableException({ code: 'PAYMENT_REFERENCE_UNAVAILABLE', message: 'Could not allocate payment reference' });
  }
}

function makeTransferContent(createdAt: Date, type: 'BK' | 'BBQ'): string {
  const yymmdd = createdAt.toISOString().slice(2, 10).replaceAll('-', '');
  const suffix = randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `VMD ${type}${yymmdd}${suffix}`;
}
function makeSandboxQrPayload(transferContent: string, amount: bigint): string { return `VMD-SANDBOX|REF=${transferContent}|AMOUNT=${amount.toString()}|CURRENCY=VND`; }
async function readExpiryHours(settings: { findUnique(args: unknown): Promise<{ value: unknown } | null> }, key: string): Promise<number> {
  const setting = await settings.findUnique({ where: { key } });
  const value = typeof setting?.value === 'number' ? setting.value : (typeof setting?.value === 'object' && setting?.value !== null && typeof (setting.value as { hours?: unknown }).hours === 'number' ? (setting.value as { hours: number }).hours : NaN);
  if (!Number.isInteger(value) || value <= 0 || value > 168) throw new ServiceUnavailableException({ code: 'PAYMENT_EXPIRY_NOT_CONFIGURED', message: 'Sandbox payment expiry is not configured' });
  return value;
}
function invalidIntent(): BadRequestException { return new BadRequestException({ code: 'INVALID_PAYMENT_INTENT', message: 'Payment intent input is invalid' }); }
function invalidBooking(): BadRequestException { return new BadRequestException({ code: 'PAYMENT_INTENT_BOOKING_INVALID', message: 'Booking is not eligible for a sandbox payment intent' }); }
function auditData(actor: { staffProfileId?: string | null; correlationId?: string | null; ipAddress?: string | null; userAgent?: string | null }, action: string, resourceId: string, afterData: Record<string, unknown>) {
  // An empty string (public/system checkout has no staff actor) must become
  // null, not pass through — `??` only catches null/undefined, and the
  // audit_logs.actor_id column is a UUID that rejects ''.
  const staffProfileId = actor.staffProfileId || null;
  return { actorType: staffProfileId ? 'STAFF' : 'SYSTEM', actorId: staffProfileId, action, resourceType: 'PAYMENT_INTENT', resourceId, afterData: afterData as Prisma.InputJsonValue, ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent?.slice(0, 500) ?? null, correlationId: actor.correlationId ?? null };
}
