import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

const PROVIDER = 'SEPAY_TEST';
const RECEIVED = 'RECEIVED';
const PROCESSED = 'PROCESSED';

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
  constructor(private readonly prisma: PrismaService, private readonly now: () => Date = () => new Date()) {}

  async processWebhookEvent(eventId: string): Promise<PaymentProcessingResult> {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.paymentWebhookEvent.findUnique({ where: { id: eventId } });
      if (!event) throw new NotFoundException({ code: 'PAYMENT_WEBHOOK_EVENT_NOT_FOUND', message: 'Webhook event not found' });
      if (event.processingStatus === PROCESSED) return { outcome: 'already_processed' };
      if (event.provider !== PROVIDER || !event.signatureValid) return this.finishIgnored(tx, event.id, 'UNTRUSTED_EVENT');

      const payload = event.payload as SePayPayload;
      const amount = validAmount(payload.transferAmount);
      if (payload.transferType !== 'in' || amount === null) return this.finishIgnored(tx, event.id, 'UNSUPPORTED_TRANSACTION');

      const intent = await this.findIntentForTransfer(tx, payload);
      if (!intent) return this.finishIgnored(tx, event.id, 'UNMATCHED_TRANSFER_CONTENT');

      const now = this.now();
      if (intent.status !== 'PENDING' || intent.expiresAt <= now) {
        return this.createReconciliation(tx, event, intent, amount, 'PAYMENT_AFTER_INTENT_EXPIRY', now);
      }

      const booking = await tx.booking.findUnique({ where: { id: intent.bookingId } });
      if (booking?.status !== 'PENDING_PAYMENT') {
        return this.createReconciliation(tx, event, intent, amount, 'BOOKING_NOT_PENDING_PAYMENT', now);
      }
      if (amount !== intent.amount) {
        return this.createReconciliation(tx, event, intent, amount, amount < intent.amount ? 'UNDERPAYMENT' : 'OVERPAYMENT', now);
      }

      const claimed = await tx.paymentWebhookEvent.updateMany({ where: { id: event.id, processingStatus: RECEIVED }, data: { processingStatus: 'PROCESSING', attemptCount: { increment: 1 } } });
      if (claimed.count !== 1) return { outcome: 'already_processed' };

      const payment = await tx.paymentIntent.updateMany({ where: { id: intent.id, status: 'PENDING' }, data: { status: 'PAID', paidAmount: amount } });
      if (payment.count !== 1) return { outcome: 'already_processed' };
      const bookingUpdate = await tx.booking.updateMany({ where: { id: booking.id, status: 'PENDING_PAYMENT' }, data: { status: 'CONFIRMED' } });
      if (bookingUpdate.count !== 1) throw new Error('booking state changed during payment confirmation');

      await tx.bookingStatusHistory.create({ data: { bookingId: booking.id, fromStatus: 'PENDING_PAYMENT', toStatus: 'CONFIRMED', reason: 'SePay Test Mode payment confirmed' } });
      await tx.roomOccupancy.updateMany({ where: { bookingId: booking.id, status: 'HOLD' }, data: { status: 'CONFIRMED' } });
      await tx.resourceHold.updateMany({ where: { referenceType: 'BOOKING', referenceId: booking.id, status: 'ACTIVE' }, data: { status: 'CONFIRMED', confirmedAt: now } });
      await tx.outboxEvent.create({ data: { aggregateType: 'PAYMENT_INTENT', aggregateId: intent.id, eventType: 'payment.intent.confirmed.sandbox', payload: { paymentIntentId: intent.id, bookingId: booking.id, amount: amount.toString(), currency: intent.currency } } });
      await tx.outboxEvent.create({ data: { aggregateType: 'BOOKING', aggregateId: booking.id, eventType: 'booking.confirmed.payment.sandbox', payload: { bookingId: booking.id, paymentIntentId: intent.id } } });
      await tx.auditLog.create({ data: audit('payment.intent.confirmed', intent.id, { bookingId: booking.id, amount: amount.toString(), provider: PROVIDER, eventId: event.id }, correlationId(event.headers)) });
      await tx.paymentWebhookEvent.update({ where: { id: event.id }, data: { processingStatus: PROCESSED, processedAt: now, errorMessage: null } });
      return { outcome: 'confirmed', paymentIntentId: intent.id };
    });
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
    const intents = await tx.paymentIntent.findMany({ where: { provider: PROVIDER }, orderBy: { createdAt: 'desc' } });
    return intents.find((intent) => {
      const reference = normalize(intent.transferContent);
      return reference.length > 0 && (normalizedContent.includes(reference) || normalizedCode.includes(reference));
    }) ?? null;
  }

  private async finishIgnored(tx: Prisma.TransactionClient, eventId: string, reason: string): Promise<PaymentProcessingResult> {
    const updated = await tx.paymentWebhookEvent.updateMany({ where: { id: eventId, processingStatus: RECEIVED }, data: { processingStatus: PROCESSED, processedAt: this.now(), errorMessage: reason, attemptCount: { increment: 1 } } });
    return updated.count === 1 ? { outcome: 'ignored' } : { outcome: 'already_processed' };
  }

  private async createReconciliation(tx: Prisma.TransactionClient, event: { id: string; headers: Prisma.JsonValue }, intent: { id: string; bookingId: string; amount: bigint; currency: string }, receivedAmount: bigint, reason: string, now: Date): Promise<PaymentProcessingResult> {
    const claimed = await tx.paymentWebhookEvent.updateMany({ where: { id: event.id, processingStatus: RECEIVED }, data: { processingStatus: 'PROCESSING', attemptCount: { increment: 1 } } });
    if (claimed.count !== 1) return { outcome: 'already_processed' };
    await tx.reconciliationCase.create({ data: { paymentIntentId: intent.id, reason, expectedAmount: intent.amount, receivedAmount } });
    await tx.outboxEvent.create({ data: { aggregateType: 'PAYMENT_INTENT', aggregateId: intent.id, eventType: 'payment.reconciliation.required.sandbox', payload: { paymentIntentId: intent.id, bookingId: intent.bookingId, reason, expectedAmount: intent.amount.toString(), receivedAmount: receivedAmount.toString(), currency: intent.currency } } });
    await tx.auditLog.create({ data: audit('payment.reconciliation.created', intent.id, { bookingId: intent.bookingId, reason, expectedAmount: intent.amount.toString(), receivedAmount: receivedAmount.toString(), eventId: event.id }, correlationId(event.headers)) });
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
