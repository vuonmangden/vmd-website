import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { SePayWebhookConfigService } from './sepay-webhook.config';

const RECEIVED = 'RECEIVED';
const PROCESSED = 'PROCESSED';
const PAYMENT_PROCESSING_CLOCK = 'PAYMENT_PROCESSING_CLOCK';

/**
 * A shortfall at or below this is treated as paid in full (bank-fee offset).
 * Approved by the owner 2026-08-19 — see docs/09_MILESTONE_0_INPUT_PACK.md §8.
 */
const UNDERPAYMENT_TOLERANCE = 10_000n;

export type PaymentProcessingResult =
  | { outcome: 'confirmed' | 'reconciliation_required'; paymentIntentId: string }
  | { outcome: 'ignored' | 'already_processed' };

interface SePayPayload {
  transferType?: unknown;
  transferAmount?: unknown;
  content?: unknown;
  code?: unknown;
}

@Injectable()
export class PaymentProcessingService {
  private readonly config: SePayWebhookConfigService;
  private readonly now: () => Date;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(SePayWebhookConfigService) configOrClock?: SePayWebhookConfigService | (() => Date),
    @Optional() @Inject(PAYMENT_PROCESSING_CLOCK)
    now: () => Date = () => new Date(),
  ) {
    // The clock-only overload keeps pre-cutover unit fixtures deterministic.
    // Nest always injects the config service in the running application.
    if (typeof configOrClock === 'function' || !configOrClock) {
      this.config = { get: () => ({ apiKey: '', mode: 'sandbox', provider: 'SEPAY_TEST' }) } as SePayWebhookConfigService;
      this.now = typeof configOrClock === 'function' ? configOrClock : now;
    } else {
      this.config = configOrClock;
      this.now = now;
    }
  }

  async processWebhookEvent(eventId: string): Promise<PaymentProcessingResult> {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.paymentWebhookEvent.findUnique({ where: { id: eventId } });
      if (!event) throw new NotFoundException({ code: 'PAYMENT_WEBHOOK_EVENT_NOT_FOUND', message: 'Webhook event not found' });
      if (event.processingStatus === PROCESSED) return { outcome: 'already_processed' };
      if (event.provider !== this.config.get().provider || !event.signatureValid) return this.finishIgnored(tx, event.id, 'UNTRUSTED_EVENT');

      const payload = event.payload as SePayPayload;
      const amount = validAmount(payload.transferAmount);
      if (payload.transferType !== 'in' || amount === null) return this.finishIgnored(tx, event.id, 'UNSUPPORTED_TRANSACTION');

      const intent = await this.findIntentForTransfer(tx, payload);
      if (!intent) return this.finishIgnored(tx, event.id, 'UNMATCHED_TRANSFER_CONTENT');

      const now = this.now();
      if (intent.status !== 'PENDING' || intent.expiresAt <= now) {
        return this.createOrUpdateReconciliation(tx, event, intent, amount, 'PAYMENT_AFTER_INTENT_EXPIRY', now);
      }

      const referenceStatus = intent.bookingId
        ? (await tx.booking.findUnique({ where: { id: intent.bookingId } }))?.status
        : (await tx.bbqReservation.findUnique({ where: { id: intent.bbqReservationId! } }))?.status;
      if (referenceStatus !== 'PENDING_PAYMENT') {
        return this.createOrUpdateReconciliation(tx, event, intent, amount, 'BOOKING_NOT_PENDING_PAYMENT', now);
      }

      const cumulativePaid = intent.paidAmount + amount;
      const shortfall = intent.amount - cumulativePaid;

      // Underpaid within tolerance (or an exact/overshoot match) confirms like a full payment.
      if (shortfall <= UNDERPAYMENT_TOLERANCE && shortfall >= 0n) {
        return this.confirmPayment(tx, event, intent, cumulativePaid, now);
      }
      if (shortfall > UNDERPAYMENT_TOLERANCE) {
        return this.createOrUpdateReconciliation(tx, event, intent, amount, 'UNDERPAYMENT', now, cumulativePaid);
      }
      return this.createOrUpdateReconciliation(tx, event, intent, amount, 'OVERPAYMENT', now, cumulativePaid);
    });
  }

  private async confirmPayment(
    tx: Prisma.TransactionClient,
    event: { id: string; headers: Prisma.JsonValue },
    intent: { id: string; bookingId: string | null; bbqReservationId: string | null; amount: bigint; currency: string },
    paidAmount: bigint,
    now: Date,
  ): Promise<PaymentProcessingResult> {
    const claimed = await tx.paymentWebhookEvent.updateMany({ where: { id: event.id, processingStatus: RECEIVED }, data: { processingStatus: 'PROCESSING', attemptCount: { increment: 1 } } });
    if (claimed.count !== 1) return { outcome: 'already_processed' };

    const payment = await tx.paymentIntent.updateMany({ where: { id: intent.id, status: 'PENDING' }, data: { status: 'PAID', paidAmount } });
    if (payment.count !== 1) return { outcome: 'already_processed' };

    if (intent.bookingId) {
      const bookingId = intent.bookingId;
      const bookingUpdate = await tx.booking.updateMany({ where: { id: bookingId, status: 'PENDING_PAYMENT' }, data: { status: 'CONFIRMED' } });
      if (bookingUpdate.count !== 1) throw new Error('booking state changed during payment confirmation');
      await tx.bookingStatusHistory.create({ data: { bookingId, fromStatus: 'PENDING_PAYMENT', toStatus: 'CONFIRMED', reason: 'SePay payment confirmed' } });
      await tx.roomOccupancy.updateMany({ where: { bookingId, status: 'HOLD' }, data: { status: 'CONFIRMED' } });
      await tx.resourceHold.updateMany({ where: { referenceType: 'BOOKING', referenceId: bookingId, status: 'ACTIVE' }, data: { status: 'CONFIRMED', confirmedAt: now } });
      await tx.outboxEvent.create({ data: { aggregateType: 'PAYMENT_INTENT', aggregateId: intent.id, eventType: 'payment.intent.confirmed', payload: { paymentIntentId: intent.id, bookingId, amount: paidAmount.toString(), currency: intent.currency } } });
      await tx.outboxEvent.create({ data: { aggregateType: 'BOOKING', aggregateId: bookingId, eventType: 'booking.confirmed.payment', payload: { bookingId, paymentIntentId: intent.id } } });
      await tx.auditLog.create({ data: audit('payment.intent.confirmed', intent.id, { bookingId, amount: paidAmount.toString(), provider: this.config.get().provider, eventId: event.id }, correlationId(event.headers)) });
    } else {
      const reservationId = intent.bbqReservationId!;
      const reservationUpdate = await tx.bbqReservation.updateMany({ where: { id: reservationId, status: 'PENDING_PAYMENT' }, data: { status: 'CONFIRMED' } });
      if (reservationUpdate.count !== 1) throw new Error('bbq reservation state changed during payment confirmation');
      await tx.bbqReservationStatusHistory.create({ data: { reservationId, fromStatus: 'PENDING_PAYMENT', toStatus: 'CONFIRMED', reason: 'SePay payment confirmed' } });
      await tx.resourceHold.updateMany({ where: { referenceType: 'BBQ_RESERVATION', referenceId: reservationId, status: 'ACTIVE' }, data: { status: 'CONFIRMED', confirmedAt: now } });
      await tx.outboxEvent.create({ data: { aggregateType: 'PAYMENT_INTENT', aggregateId: intent.id, eventType: 'payment.intent.confirmed', payload: { paymentIntentId: intent.id, bbqReservationId: reservationId, amount: paidAmount.toString(), currency: intent.currency } } });
      await tx.outboxEvent.create({ data: { aggregateType: 'BBQ_RESERVATION', aggregateId: reservationId, eventType: 'bbq_reservation.confirmed.payment', payload: { reservationId, paymentIntentId: intent.id } } });
      await tx.auditLog.create({ data: audit('payment.intent.confirmed', intent.id, { bbqReservationId: reservationId, amount: paidAmount.toString(), provider: this.config.get().provider, eventId: event.id }, correlationId(event.headers)) });
    }

    // A prior underpayment case for this intent is now moot — the shortfall closed.
    await tx.reconciliationCase.updateMany({ where: { paymentIntentId: intent.id, status: 'OPEN', reason: 'UNDERPAYMENT' }, data: { status: 'RESOLVED', resolvedAt: now, resolutionOutcome: 'TOPPED_UP' } });
    await tx.paymentWebhookEvent.update({ where: { id: event.id }, data: { processingStatus: PROCESSED, processedAt: now, errorMessage: null } });
    return { outcome: 'confirmed', paymentIntentId: intent.id };
  }

  async publicStatus(paymentIntentId: string) {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      select: { id: true, status: true, amount: true, currency: true, expiresAt: true, transferContent: true, reconciliationCases: { where: { status: 'OPEN' }, select: { id: true }, take: 1 } },
    });
    if (!intent) throw new NotFoundException({ code: 'PAYMENT_STATUS_NOT_FOUND', message: 'Payment status not found' });
    return {
      paymentIntentId: intent.id,
      status: intent.reconciliationCases.length > 0 ? 'RECONCILIATION_REQUIRED' : publicStatus(intent.status),
      amount: intent.amount.toString(),
      currency: intent.currency,
      expiresAt: intent.expiresAt.toISOString(),
      transferContent: intent.transferContent,
    };
  }

  private async findIntentForTransfer(tx: Prisma.TransactionClient, payload: SePayPayload) {
    const normalizedContent = normalize(payload.content);
    const normalizedCode = normalize(payload.code);
    if (!normalizedContent && !normalizedCode) return null;
    const intents = await tx.paymentIntent.findMany({ where: { provider: this.config.get().provider }, orderBy: { createdAt: 'desc' } });
    return intents.find((intent) => {
      const reference = normalize(intent.transferContent);
      return reference.length > 0 && (normalizedContent.includes(reference) || normalizedCode.includes(reference));
    }) ?? null;
  }

  private async finishIgnored(tx: Prisma.TransactionClient, eventId: string, reason: string): Promise<PaymentProcessingResult> {
    const updated = await tx.paymentWebhookEvent.updateMany({ where: { id: eventId, processingStatus: RECEIVED }, data: { processingStatus: PROCESSED, processedAt: this.now(), errorMessage: reason, attemptCount: { increment: 1 } } });
    return updated.count === 1 ? { outcome: 'ignored' } : { outcome: 'already_processed' };
  }

  /**
   * Opens (or, for a repeat UNDERPAYMENT top-up on the same intent, updates in place)
   * a reconciliation case. `cumulativePaid` — when given — is persisted onto the
   * payment intent so a later top-up event can compute the remaining shortfall; the
   * hold/booking are deliberately left untouched (owner policy: no reset on top-up).
   */
  private async createOrUpdateReconciliation(
    tx: Prisma.TransactionClient,
    event: { id: string; headers: Prisma.JsonValue },
    intent: { id: string; bookingId: string | null; bbqReservationId: string | null; amount: bigint; currency: string },
    receivedAmount: bigint,
    reason: string,
    now: Date,
    cumulativePaid?: bigint,
  ): Promise<PaymentProcessingResult> {
    const claimed = await tx.paymentWebhookEvent.updateMany({ where: { id: event.id, processingStatus: RECEIVED }, data: { processingStatus: 'PROCESSING', attemptCount: { increment: 1 } } });
    if (claimed.count !== 1) return { outcome: 'already_processed' };

    if (cumulativePaid !== undefined) {
      await tx.paymentIntent.updateMany({ where: { id: intent.id }, data: { paidAmount: cumulativePaid } });
    }
    const totalReceived = cumulativePaid ?? receivedAmount;

    const existingCase = reason === 'UNDERPAYMENT'
      ? await tx.reconciliationCase.findFirst({ where: { paymentIntentId: intent.id, status: 'OPEN', reason: 'UNDERPAYMENT' } })
      : null;
    if (existingCase) {
      await tx.reconciliationCase.updateMany({ where: { id: existingCase.id }, data: { receivedAmount: totalReceived } });
    } else {
      await tx.reconciliationCase.create({ data: { paymentIntentId: intent.id, reason, expectedAmount: intent.amount, receivedAmount: totalReceived } });
    }

    await tx.outboxEvent.create({ data: { aggregateType: 'PAYMENT_INTENT', aggregateId: intent.id, eventType: 'payment.reconciliation.required', payload: { paymentIntentId: intent.id, bookingId: intent.bookingId, bbqReservationId: intent.bbqReservationId, reason, expectedAmount: intent.amount.toString(), receivedAmount: totalReceived.toString(), currency: intent.currency } } });
    await tx.auditLog.create({ data: audit('payment.reconciliation.created', intent.id, { bookingId: intent.bookingId, bbqReservationId: intent.bbqReservationId, reason, expectedAmount: intent.amount.toString(), receivedAmount: totalReceived.toString(), eventId: event.id }, correlationId(event.headers)) });
    await tx.paymentWebhookEvent.update({ where: { id: event.id }, data: { processingStatus: PROCESSED, processedAt: now, errorMessage: reason } });
    return { outcome: 'reconciliation_required', paymentIntentId: intent.id };
  }
}

function normalize(value: unknown): string { return typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : ''; }
function validAmount(value: unknown): bigint | null { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? BigInt(value) : null; }
function correlationId(headers: Prisma.JsonValue): string | null {
  if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
    const value = (headers as Record<string, unknown>)['correlationId'];
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return value;
  }
  return null;
}
function audit(action: string, resourceId: string, afterData: Record<string, unknown>, requestCorrelationId: string | null) {
  return { actorType: 'SYSTEM', actorId: null, action, resourceType: 'PAYMENT_INTENT', resourceId, afterData: afterData as Prisma.InputJsonValue, correlationId: requestCorrelationId };
}
function publicStatus(status: string): 'PENDING' | 'PAID' | 'EXPIRED' { return status === 'PAID' ? 'PAID' : status === 'EXPIRED' ? 'EXPIRED' : 'PENDING'; }
