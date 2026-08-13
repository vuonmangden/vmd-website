import { PaymentProcessingService } from './payment-processing.service';

const now = new Date('2099-08-13T12:00:00.000Z');
const intent = { id: '00000000-0000-4000-8000-000000000010', bookingId: '00000000-0000-4000-8000-000000000011', provider: 'SEPAY_TEST', status: 'PENDING', amount: 2500000n, currency: 'VND', transferContent: 'VMD BK990813A1B2', expiresAt: new Date('2099-08-14T12:00:00.000Z'), createdAt: now };
const booking = { id: intent.bookingId, status: 'PENDING_PAYMENT' };
const event = { id: '00000000-0000-4000-8000-000000000012', provider: 'SEPAY_TEST', signatureValid: true, processingStatus: 'RECEIVED', headers: { correlationId: '00000000-0000-4000-8000-000000000013' }, payload: { transferType: 'in', transferAmount: 2500000, content: 'Thanh toan VMD BK990813A1B2', code: '' } };

function fixture(overrides: Record<string, unknown> = {}) {
  const tx = {
    paymentWebhookEvent: { findUnique: jest.fn().mockResolvedValue(event), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn() },
    paymentIntent: { findMany: jest.fn().mockResolvedValue([intent]), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUnique: jest.fn() },
    booking: { findUnique: jest.fn().mockResolvedValue(booking), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    bookingStatusHistory: { create: jest.fn() }, roomOccupancy: { updateMany: jest.fn() }, resourceHold: { updateMany: jest.fn() },
    reconciliationCase: { create: jest.fn() }, outboxEvent: { create: jest.fn() }, auditLog: { create: jest.fn() },
    ...overrides,
  };
  return { tx, prisma: { $transaction: jest.fn((operation: (value: typeof tx) => unknown) => operation(tx)), paymentIntent: tx.paymentIntent } };
}

describe('PaymentProcessingService', () => {
  it('confirms exact incoming payments once with booking, holds, occupancy, audit and outbox in one transaction', async () => {
    const { tx, prisma } = fixture();
    await expect(new PaymentProcessingService(prisma as never, () => now).processWebhookEvent(event.id)).resolves.toEqual({ outcome: 'confirmed', paymentIntentId: intent.id });
    expect(tx.paymentIntent.updateMany).toHaveBeenCalledWith({ where: { id: intent.id, status: 'PENDING' }, data: { status: 'PAID', paidAmount: 2500000n } });
    expect(tx.booking.updateMany).toHaveBeenCalledWith({ where: { id: booking.id, status: 'PENDING_PAYMENT' }, data: { status: 'CONFIRMED' } });
    expect(tx.roomOccupancy.updateMany).toHaveBeenCalledWith({ where: { bookingId: booking.id, status: 'HOLD' }, data: { status: 'CONFIRMED' } });
    expect(tx.resourceHold.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CONFIRMED', confirmedAt: now }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'payment.intent.confirmed', correlationId: '00000000-0000-4000-8000-000000000013' }) }));
    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(2);
  });

  it('does not duplicate a processed webhook event', async () => {
    const { tx, prisma } = fixture({ paymentWebhookEvent: { findUnique: jest.fn().mockResolvedValue({ ...event, processingStatus: 'PROCESSED' }), updateMany: jest.fn(), update: jest.fn() } });
    await expect(new PaymentProcessingService(prisma as never, () => now).processWebhookEvent(event.id)).resolves.toEqual({ outcome: 'already_processed' });
    expect(tx.paymentIntent.updateMany).not.toHaveBeenCalled();
  });

  it.each([[2400000, 'UNDERPAYMENT'], [2600000, 'OVERPAYMENT']])('creates reconciliation for amount %i (%s)', async (transferAmount, reason) => {
    const { tx, prisma } = fixture({ paymentWebhookEvent: { findUnique: jest.fn().mockResolvedValue({ ...event, payload: { ...event.payload, transferAmount } }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn() } });
    await expect(new PaymentProcessingService(prisma as never, () => now).processWebhookEvent(event.id)).resolves.toEqual({ outcome: 'reconciliation_required', paymentIntentId: intent.id });
    expect(tx.reconciliationCase.create).toHaveBeenCalledWith({ data: expect.objectContaining({ paymentIntentId: intent.id, reason, receivedAmount: BigInt(transferAmount) }) });
    expect(tx.booking.updateMany).not.toHaveBeenCalled();
  });

  it('safely retains a wrong transfer reference without exposing or confirming a booking', async () => {
    const { tx, prisma } = fixture({ paymentWebhookEvent: { findUnique: jest.fn().mockResolvedValue({ ...event, payload: { ...event.payload, content: 'WRONG CONTENT' } }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn() } });
    await expect(new PaymentProcessingService(prisma as never, () => now).processWebhookEvent(event.id)).resolves.toEqual({ outcome: 'ignored' });
    expect(tx.paymentIntent.updateMany).not.toHaveBeenCalled(); expect(tx.reconciliationCase.create).not.toHaveBeenCalled();
  });

  it('creates reconciliation for late payment and an incompatible booking state', async () => {
    const expired = fixture({ paymentIntent: { findMany: jest.fn().mockResolvedValue([{ ...intent, expiresAt: new Date('2099-08-12T12:00:00.000Z') }]), updateMany: jest.fn(), findUnique: jest.fn() } });
    await expect(new PaymentProcessingService(expired.prisma as never, () => now).processWebhookEvent(event.id)).resolves.toEqual({ outcome: 'reconciliation_required', paymentIntentId: intent.id });
    expect(expired.tx.reconciliationCase.create).toHaveBeenCalledWith({ data: expect.objectContaining({ reason: 'PAYMENT_AFTER_INTENT_EXPIRY' }) });

    const wrongState = fixture({ booking: { findUnique: jest.fn().mockResolvedValue({ ...booking, status: 'EXPIRED' }), updateMany: jest.fn() } });
    await expect(new PaymentProcessingService(wrongState.prisma as never, () => now).processWebhookEvent(event.id)).resolves.toEqual({ outcome: 'reconciliation_required', paymentIntentId: intent.id });
    expect(wrongState.tx.reconciliationCase.create).toHaveBeenCalledWith({ data: expect.objectContaining({ reason: 'BOOKING_NOT_PENDING_PAYMENT' }) });
  });

  it('returns a stable customer-safe status without booking, provider, account or raw webhook fields', async () => {
    const { prisma } = fixture();
    prisma.paymentIntent.findUnique.mockResolvedValue({ id: intent.id, status: 'PENDING', amount: intent.amount, currency: 'VND', expiresAt: intent.expiresAt, transferContent: intent.transferContent, reconciliationCases: [{ id: 'case' }] });
    await expect(new PaymentProcessingService(prisma as never, () => now).publicStatus(intent.id)).resolves.toEqual({ paymentIntentId: intent.id, status: 'RECONCILIATION_REQUIRED', amount: '2500000', currency: 'VND', expiresAt: intent.expiresAt.toISOString(), transferContent: intent.transferContent });
  });

  it('propagates a transactional failure before emitting audit or outbox records', async () => {
    const { tx, prisma } = fixture({ booking: { findUnique: jest.fn().mockResolvedValue(booking), updateMany: jest.fn().mockRejectedValue(new Error('forced rollback')) } });
    await expect(new PaymentProcessingService(prisma as never, () => now).processWebhookEvent(event.id)).rejects.toThrow('forced rollback');
    expect(tx.bookingStatusHistory.create).not.toHaveBeenCalled(); expect(tx.outboxEvent.create).not.toHaveBeenCalled(); expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
