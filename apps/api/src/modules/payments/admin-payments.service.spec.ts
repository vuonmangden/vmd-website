import { NotFoundException } from '@nestjs/common';
import { AdminPaymentsService } from './admin-payments.service';

const INTENT_ID = '00000000-0000-4000-8000-000000000010';
const BOOKING_ID = '00000000-0000-4000-8000-000000000011';

function fakeListRow(overrides?: Record<string, unknown>) {
  return {
    id: INTENT_ID,
    bookingId: BOOKING_ID,
    provider: 'SEPAY_TEST',
    status: 'PENDING',
    amount: 2500000n,
    paidAmount: 0n,
    currency: 'VND',
    transferContent: 'VMD BK260820A1B2',
    expiresAt: new Date('2026-08-21T12:00:00.000Z'),
    createdAt: new Date('2026-08-20T12:00:00.000Z'),
    booking: { bookingCode: 'SYN-ABC123', customer: { fullName: 'Nguyễn Văn A' } },
    reconciliationCases: [],
    ...overrides,
  };
}

function prismaMock() {
  return {
    paymentIntent: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
}

describe('AdminPaymentsService.list', () => {
  it('flattens booking/customer fields and open cases onto each row', async () => {
    const prisma = prismaMock();
    prisma.paymentIntent.findMany.mockResolvedValue([fakeListRow()]);
    prisma.paymentIntent.count.mockResolvedValue(1);
    const service = new AdminPaymentsService(prisma as never);

    const result = await service.list({ page: 1, pageSize: 50 });

    expect(result.items[0]).toEqual({
      id: INTENT_ID,
      bookingId: BOOKING_ID,
      bookingCode: 'SYN-ABC123',
      customerName: 'Nguyễn Văn A',
      provider: 'SEPAY_TEST',
      status: 'PENDING',
      amount: '2500000',
      paidAmount: '0',
      currency: 'VND',
      transferContent: 'VMD BK260820A1B2',
      expiresAt: fakeListRow().expiresAt,
      createdAt: fakeListRow().createdAt,
      openReconciliationCases: [],
    });
    expect(result.total).toBe(1);
  });

  it('filters by status and bookingId when given', async () => {
    const prisma = prismaMock();
    const service = new AdminPaymentsService(prisma as never);

    await service.list({ status: 'PAID', bookingId: BOOKING_ID, page: 1, pageSize: 50 });

    expect(prisma.paymentIntent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PAID', bookingId: BOOKING_ID } }),
    );
  });

  it('paginates using skip/take', async () => {
    const prisma = prismaMock();
    const service = new AdminPaymentsService(prisma as never);

    await service.list({ page: 3, pageSize: 20 });

    expect(prisma.paymentIntent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
  });

  it('surfaces only OPEN reconciliation cases in the list select', async () => {
    const prisma = prismaMock();
    const service = new AdminPaymentsService(prisma as never);

    await service.list({ page: 1, pageSize: 50 });

    const selectArg = prisma.paymentIntent.findMany.mock.calls[0][0].select.reconciliationCases;
    expect(selectArg.where).toEqual({ status: 'OPEN' });
  });
});

describe('AdminPaymentsService.detail', () => {
  it('serializes BigInt fields and includes full case history', async () => {
    const prisma = prismaMock();
    prisma.paymentIntent.findUnique.mockResolvedValue({
      id: INTENT_ID,
      bookingId: BOOKING_ID,
      provider: 'SEPAY_TEST',
      status: 'PENDING',
      amount: 2500000n,
      paidAmount: 2490000n,
      currency: 'VND',
      transferContent: 'VMD BK260820A1B2',
      expiresAt: new Date('2026-08-21T12:00:00.000Z'),
      createdAt: new Date('2026-08-20T12:00:00.000Z'),
      updatedAt: new Date('2026-08-20T12:05:00.000Z'),
      booking: { id: BOOKING_ID, bookingCode: 'SYN-ABC123', status: 'PENDING_PAYMENT', customer: { id: 'cust-1', fullName: 'Nguyễn Văn A' } },
      reconciliationCases: [
        {
          id: 'case-1',
          status: 'OPEN',
          reason: 'UNDERPAYMENT',
          expectedAmount: 2500000n,
          receivedAmount: 2490000n,
          createdAt: new Date('2026-08-20T12:05:00.000Z'),
          resolvedAt: null,
          resolvedBy: null,
          resolutionOutcome: null,
          resolutionNote: null,
        },
      ],
    });
    const service = new AdminPaymentsService(prisma as never);

    const result = await service.detail(INTENT_ID);

    expect(result.amount).toBe('2500000');
    expect(result.paidAmount).toBe('2490000');
    expect(result.reconciliationCases[0]).toMatchObject({
      expectedAmount: '2500000',
      receivedAmount: '2490000',
    });
  });

  it('throws NotFoundException when the intent does not exist', async () => {
    const prisma = prismaMock();
    const service = new AdminPaymentsService(prisma as never);

    await expect(service.detail(INTENT_ID)).rejects.toThrow(NotFoundException);
  });
});
