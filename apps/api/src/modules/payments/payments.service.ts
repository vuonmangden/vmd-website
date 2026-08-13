import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

const ROOM_EXPIRY_SETTING = 'payment.expiry_hours.room';
const PAYMENT_IDEMPOTENCY_SCOPE = 'payment.intent.sandbox';

export interface PaymentActor {
  staffProfileId: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}
export interface PaymentIntentResponse { paymentIntentId: string; bookingId: string; status: string; amount: string; currency: string; transferContent: string; qrPayload: string; expiresAt: string; createdAt: string; }

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

        const response = await this.createWithUniqueTransferContent(tx, booking, expiresAt, now);
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
    const intent = await this.prisma.paymentIntent.findUnique({ where: { id }, select: { id: true, bookingId: true, provider: true, status: true, amount: true, paidAmount: true, currency: true, transferContent: true, qrPayload: true, expiresAt: true, createdAt: true } });
    if (!intent) throw new NotFoundException({ code: 'PAYMENT_INTENT_NOT_FOUND', message: 'Payment intent not found' });
    return intent;
  }

  /** Used by the public room checkout while its booking transaction is still open. */
  async createSandboxIntentForCheckout(
    tx: Prisma.TransactionClient,
    booking: { id: string; totalAmount: bigint; currency: string; createdAt: Date },
    holdId: string,
    actor: PaymentActor,
  ): Promise<PaymentIntentResponse> {
    const now = this.now();
    const expiryHours = await readExpiryHours(tx.appSetting, ROOM_EXPIRY_SETTING);
    const expiresAt = new Date(now.getTime() + expiryHours * 3_600_000);
    const response = await this.createWithUniqueTransferContent(tx, booking, expiresAt, now);
    await tx.resourceHold.update({ where: { id: holdId }, data: { expiresAt } });
    await tx.outboxEvent.create({ data: { aggregateType: 'PAYMENT_INTENT', aggregateId: response.paymentIntentId, eventType: 'payment.intent.created.sandbox', payload: response } });
    await tx.auditLog.create({ data: auditData(actor, 'payment.intent.created', response.paymentIntentId, { bookingId: booking.id, status: 'PENDING', transferContent: response.transferContent }) });
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

      const booking = await tx.booking.findUnique({ where: { id: intent.bookingId } });
      if (booking?.status === 'PENDING_PAYMENT') {
        await tx.booking.update({ where: { id: booking.id }, data: { status: 'EXPIRED' } });
        await tx.bookingStatusHistory.create({ data: { bookingId: booking.id, fromStatus: 'PENDING_PAYMENT', toStatus: 'EXPIRED', reason: 'payment intent expired' } });
        await tx.roomOccupancy.deleteMany({ where: { bookingId: booking.id } });
        await tx.resourceHold.updateMany({ where: { referenceType: 'BOOKING', referenceId: booking.id, status: 'ACTIVE' }, data: { status: 'RELEASED', releasedAt: now } });
        await tx.outboxEvent.create({ data: { aggregateType: 'BOOKING', aggregateId: booking.id, eventType: 'booking.expired.payment', payload: { bookingId: booking.id, paymentIntentId } } });
      }
      if (intent.paidAmount > 0n) await tx.reconciliationCase.create({ data: { paymentIntentId, reason: 'PARTIAL_PAYMENT_AFTER_EXPIRY', expectedAmount: intent.amount, receivedAmount: intent.paidAmount } });
      await tx.auditLog.create({ data: auditData({ staffProfileId: null, correlationId: null }, 'payment.intent.expired', paymentIntentId, { bookingId: intent.bookingId, partialPayment: intent.paidAmount > 0n }) });
      return true;
    });
  }

  private async createWithUniqueTransferContent(tx: Prisma.TransactionClient, booking: { id: string; totalAmount: bigint; currency: string; createdAt: Date }, expiresAt: Date, now: Date) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const transferContent = makeTransferContent(booking.createdAt, 'BK');
      try {
        const intent = await tx.paymentIntent.create({ data: { bookingId: booking.id, amount: booking.totalAmount, currency: booking.currency, transferContent, qrPayload: makeSandboxQrPayload(transferContent, booking.totalAmount), expiresAt } });
        return { paymentIntentId: intent.id, bookingId: booking.id, status: intent.status, amount: intent.amount.toString(), currency: intent.currency, transferContent, qrPayload: intent.qrPayload, expiresAt: intent.expiresAt.toISOString(), createdAt: now.toISOString() };
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002' || attempt === 4) throw error;
      }
    }
    throw new ServiceUnavailableException({ code: 'PAYMENT_REFERENCE_UNAVAILABLE', message: 'Could not allocate payment reference' });
  }
}

function makeTransferContent(createdAt: Date, type: 'BK'): string {
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
function auditData(actor: { staffProfileId?: string | null; correlationId?: string | null; ipAddress?: string | null; userAgent?: string | null }, action: string, resourceId: string, afterData: Record<string, unknown>) { return { actorType: actor.staffProfileId ? 'STAFF' : 'SYSTEM', actorId: actor.staffProfileId ?? null, action, resourceType: 'PAYMENT_INTENT', resourceId, afterData: afterData as Prisma.InputJsonValue, ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent?.slice(0, 500) ?? null, correlationId: actor.correlationId ?? null }; }
