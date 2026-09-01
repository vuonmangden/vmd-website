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
