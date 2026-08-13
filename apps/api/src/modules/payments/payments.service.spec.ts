import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

const booking = { id: '00000000-0000-4000-8000-000000000001', source: 'SYNTHETIC', status: 'PENDING_PAYMENT', totalAmount: 2500000n, currency: 'VND', createdAt: new Date('2099-08-13T00:00:00.000Z') };
const actor = { staffProfileId: '00000000-0000-4000-8000-000000000002', correlationId: '00000000-0000-4000-8000-000000000003' };
function transaction(overrides: Record<string, unknown> = {}) {
  const tx = {
    idempotencyKey: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    booking: { findUnique: jest.fn().mockResolvedValue(booking), update: jest.fn() },
    resourceHold: { findFirst: jest.fn().mockResolvedValue({ id: 'hold' }), update: jest.fn(), updateMany: jest.fn() },
    appSetting: { findUnique: jest.fn().mockResolvedValue({ value: { hours: 24 } }) },
    paymentIntent: { create: jest.fn().mockResolvedValue({ id: '00000000-0000-4000-8000-000000000004', status: 'PENDING', amount: 2500000n, currency: 'VND', qrPayload: 'VMD-SANDBOX', expiresAt: new Date('2099-08-14T00:00:00.000Z') }), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
    outboxEvent: { create: jest.fn() }, auditLog: { create: jest.fn() }, bookingStatusHistory: { create: jest.fn() }, roomOccupancy: { deleteMany: jest.fn() }, reconciliationCase: { create: jest.fn() }, ...overrides,
  };
  return { tx, prisma: { $transaction: jest.fn((operation: (value: typeof tx) => unknown) => operation(tx)), paymentIntent: tx.paymentIntent } };
}

describe('PaymentsService', () => {
  const now = new Date('2099-08-13T00:00:00.000Z');
  it('creates an idempotent sandbox intent with an uppercase unique safe transfer reference', async () => {
    const { tx, prisma } = transaction(); const service = new PaymentsService(prisma as never, () => now);
    const result = await service.createSandboxIntent(booking.id, 'pay-key', actor);
    expect(result.transferContent).toMatch(/^VMD BK\d{6}[A-F0-9]{4}$/);
    expect(result.qrPayload).toContain('VMD-SANDBOX');
    expect(tx.resourceHold.update).toHaveBeenCalledWith({ where: { id: 'hold' }, data: { expiresAt: new Date('2099-08-14T00:00:00.000Z') } });
    expect(tx.idempotencyKey.create).toHaveBeenCalled(); expect(tx.outboxEvent.create).toHaveBeenCalled(); expect(tx.auditLog.create).toHaveBeenCalled();
  });
  it('returns the saved response without creating another payment intent', async () => {
    const response = { paymentIntentId: 'existing' }; const { tx, prisma } = transaction({ idempotencyKey: { findUnique: jest.fn().mockResolvedValue({ responseBody: response }), create: jest.fn() } });
    const service = new PaymentsService(prisma as never, () => now);
    await expect(service.createSandboxIntent(booking.id, 'pay-key', actor)).resolves.toEqual(response); expect(tx.paymentIntent.create).not.toHaveBeenCalled();
  });
  it('rejects non-synthetic/non-pending bookings and a missing active hold', async () => {
    const ineligible = transaction({ booking: { findUnique: jest.fn().mockResolvedValue({ ...booking, source: 'DIRECT' }), update: jest.fn() } });
    await expect(new PaymentsService(ineligible.prisma as never, () => now).createSandboxIntent(booking.id, 'key', actor)).rejects.toBeInstanceOf(BadRequestException);
    const missingHold = transaction({ resourceHold: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn(), updateMany: jest.fn() } });
    await expect(new PaymentsService(missingHold.prisma as never, () => now).createSandboxIntent(booking.id, 'key', actor)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('fails closed without an app_settings expiry value', async () => {
    const { prisma } = transaction({ appSetting: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(new PaymentsService(prisma as never, () => now).createSandboxIntent(booking.id, 'key', actor)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('expires once, releases booking resources and creates reconciliation for partial payment', async () => {
    const expiredIntent = { id: 'intent', bookingId: booking.id, status: 'PENDING', expiresAt: new Date('2099-08-12T00:00:00.000Z'), amount: 2500000n, paidAmount: 500000n };
    const { tx, prisma } = transaction({ paymentIntent: { create: jest.fn(), findUnique: jest.fn().mockResolvedValue(expiredIntent), findMany: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } });
    const service = new PaymentsService(prisma as never, () => now);
    await expect(service.expireOne('intent', now)).resolves.toBe(true);
    expect(tx.booking.update).toHaveBeenCalledWith({ where: { id: booking.id }, data: { status: 'EXPIRED' } }); expect(tx.roomOccupancy.deleteMany).toHaveBeenCalledWith({ where: { bookingId: booking.id } }); expect(tx.reconciliationCase.create).toHaveBeenCalledWith({ data: expect.objectContaining({ reason: 'PARTIAL_PAYMENT_AFTER_EXPIRY' }) });
  });
  it('does not overwrite an already settled or retried payment state', async () => {
    const { tx, prisma } = transaction({ paymentIntent: { create: jest.fn(), findUnique: jest.fn().mockResolvedValue({ id: 'intent', status: 'PAID', expiresAt: new Date('2099-08-12T00:00:00.000Z') }), findMany: jest.fn(), updateMany: jest.fn() } });
    await expect(new PaymentsService(prisma as never, () => now).expireOne('intent', now)).resolves.toBe(false); expect(tx.booking.update).not.toHaveBeenCalled();
  });
});
