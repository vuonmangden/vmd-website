import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const CASE_ID = '00000000-0000-4000-8000-000000000050';
const CORRELATION_ID = '00000000-0000-4000-8000-000000000051';

const ACTOR: AuthenticatedActor = {
  staffProfileId: '00000000-0000-4000-8000-000000000001',
  authUserId: '00000000-0000-4000-8000-000000000002',
  fullName: 'Manager',
  email: 'manager@example.com',
  roles: ['MANAGER'],
  permissions: ['payment.reconcile'],
};

function fakeCase(overrides?: Record<string, unknown>) {
  return {
    id: CASE_ID,
    paymentIntentId: '00000000-0000-4000-8000-000000000010',
    status: 'OPEN',
    reason: 'UNDERPAYMENT',
    expectedAmount: 2500000n,
    receivedAmount: 2000000n,
    resolvedAt: null,
    ...overrides,
  };
}

function prismaMock() {
  const reconciliationCase = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(fakeCase()),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const auditLog = { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const tx = { reconciliationCase, auditLog };
  return {
    reconciliationCase,
    auditLog,
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : [],
    ),
  };
}

describe('ReconciliationService.list', () => {
  it('defaults to OPEN cases', async () => {
    const prisma = prismaMock();
    const service = new ReconciliationService(prisma as never);
    await service.list({});
    expect(prisma.reconciliationCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'OPEN' } }),
    );
  });

  it('filters by reason when given', async () => {
    const prisma = prismaMock();
    const service = new ReconciliationService(prisma as never);
    await service.list({ status: 'RESOLVED', reason: 'PAYMENT_AFTER_INTENT_EXPIRY' });
    expect(prisma.reconciliationCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'RESOLVED', reason: 'PAYMENT_AFTER_INTENT_EXPIRY' } }),
    );
  });
});

describe('ReconciliationService.findById', () => {
  it('throws NotFoundException when missing', async () => {
    const prisma = prismaMock();
    prisma.reconciliationCase.findUnique.mockResolvedValue(null);
    const service = new ReconciliationService(prisma as never);
    await expect(service.findById(CASE_ID)).rejects.toThrow(NotFoundException);
  });
});

describe('ReconciliationService.resolve', () => {
  it('marks the case RESOLVED with actor, outcome, note and an audit entry', async () => {
    const prisma = prismaMock();
    const service = new ReconciliationService(prisma as never);
    await service.resolve(ACTOR, CASE_ID, 'REFUNDED', 'Hoàn 100% qua chuyển khoản, biên bản đính kèm', CORRELATION_ID);

    expect(prisma.reconciliationCase.updateMany).toHaveBeenCalledWith({
      where: { id: CASE_ID, status: 'OPEN' },
      data: {
        status: 'RESOLVED',
        resolvedAt: expect.any(Date),
        resolvedBy: ACTOR.staffProfileId,
        resolutionOutcome: 'REFUNDED',
        resolutionNote: 'Hoàn 100% qua chuyển khoản, biên bản đính kèm',
      },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'payment.reconciliation.resolved',
          resourceId: CASE_ID,
          correlationId: CORRELATION_ID,
        }),
      }),
    );
  });

  it('throws NotFoundException when the case does not exist', async () => {
    const prisma = prismaMock();
    prisma.reconciliationCase.findUnique.mockResolvedValue(null);
    const service = new ReconciliationService(prisma as never);
    await expect(service.resolve(ACTOR, CASE_ID, 'REFUNDED', 'note')).rejects.toThrow(NotFoundException);
    expect(prisma.reconciliationCase.updateMany).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the case is already resolved (race)', async () => {
    const prisma = prismaMock();
    prisma.reconciliationCase.updateMany.mockResolvedValue({ count: 0 });
    const service = new ReconciliationService(prisma as never);
    await expect(service.resolve(ACTOR, CASE_ID, 'REFUNDED', 'note')).rejects.toThrow(ConflictException);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});

/**
 * Money columns are BigInt, and `JSON.stringify` throws on BigInt. Express's
 * `res.json` is exactly `JSON.stringify`, so a response still carrying BigInt
 * answers 500 instead of the data. Asserting on the returned object alone
 * never catches that — these serialize it the way the HTTP layer does.
 */
describe('ReconciliationService HTTP serialization', () => {
  const WITH_INTENT = fakeCase({
    paymentIntent: { id: 'intent-1', bookingId: 'booking-1', bbqReservationId: null, amount: 2500000n, currency: 'VND', status: 'PENDING', expiresAt: new Date('2026-09-01T00:00:00.000Z'), transferContent: 'VMD1' },
  });

  it('list returns rows that survive JSON.stringify, with money as decimal strings', async () => {
    const prisma = prismaMock();
    prisma.reconciliationCase.findMany.mockResolvedValue([WITH_INTENT]);
    const service = new ReconciliationService(prisma as never);

    const result = await service.list({});

    expect(() => JSON.stringify(result)).not.toThrow();
    expect(result[0]).toEqual(expect.objectContaining({ expectedAmount: '2500000', receivedAmount: '2000000' }));
    expect(result[0]?.paymentIntent).toEqual(expect.objectContaining({ amount: '2500000' }));
  });

  it('findById returns a row that survives JSON.stringify', async () => {
    const prisma = prismaMock();
    prisma.reconciliationCase.findUnique.mockResolvedValue(WITH_INTENT);
    const service = new ReconciliationService(prisma as never);

    const result = await service.findById(CASE_ID);

    expect(() => JSON.stringify(result)).not.toThrow();
    expect(result).toEqual(expect.objectContaining({ expectedAmount: '2500000', receivedAmount: '2000000' }));
  });

  it('resolve returns a row that survives JSON.stringify', async () => {
    const prisma = prismaMock();
    prisma.reconciliationCase.findUnique.mockResolvedValue(fakeCase({ status: 'RESOLVED' }));
    const service = new ReconciliationService(prisma as never);

    const result = await service.resolve(ACTOR, CASE_ID, 'REFUNDED', 'Đã hoàn tiền qua chuyển khoản');

    expect(() => JSON.stringify(result)).not.toThrow();
    expect(result).toEqual(expect.objectContaining({ expectedAmount: '2500000' }));
  });
});
