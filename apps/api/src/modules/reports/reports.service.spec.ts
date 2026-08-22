import { ReportsService } from './reports.service';

function prismaMock() {
  return {
    booking: { findMany: jest.fn().mockResolvedValue([]) },
    paymentIntent: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { paidAmount: null } }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    room: { count: jest.fn().mockResolvedValue(0) },
    roomBlock: { findMany: jest.fn().mockResolvedValue([]) },
    roomOccupancy: { groupBy: jest.fn().mockResolvedValue([]) },
    bbqReservation: { findMany: jest.fn().mockResolvedValue([]) },
    reconciliationCase: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((arg: unknown) => (Array.isArray(arg) ? Promise.all(arg) : arg)),
  };
}

const FROM = new Date('2026-08-01T00:00:00.000Z');
const TO = new Date('2026-08-08T00:00:00.000Z');

describe('ReportsService.bookings', () => {
  it('tallies status and source, scoped to the Asia/Ho_Chi_Minh instant range', async () => {
    const prisma = prismaMock();
    prisma.booking.findMany.mockResolvedValue([
      { status: 'CONFIRMED', source: 'DIRECT' },
      { status: 'CONFIRMED', source: 'DIRECT' },
      { status: 'CANCELLED', source: 'GOOGLE' },
    ]);
    const service = new ReportsService(prisma as never);

    const result = await service.bookings({ from: FROM, to: TO });

    expect(result.total).toBe(3);
    expect(result.byStatus).toEqual({ CONFIRMED: 2, CANCELLED: 1 });
    expect(result.bySource).toEqual({ DIRECT: 2, GOOGLE: 1 });
    const where = prisma.booking.findMany.mock.calls[0][0].where;
    expect(where.createdAt.gte).toEqual(new Date('2026-07-31T17:00:00.000Z'));
    expect(where.createdAt.lt).toEqual(new Date('2026-08-07T17:00:00.000Z'));
  });
});

describe('ReportsService.revenue', () => {
  it('separates payment-confirmed revenue from booking-created value, and never fabricates a discount', async () => {
    const prisma = prismaMock();
    prisma.paymentIntent.aggregate
      .mockResolvedValueOnce({ _sum: { paidAmount: 1_000_000n } }) // room
      .mockResolvedValueOnce({ _sum: { paidAmount: 300_000n } }); // bbq
    prisma.booking.findMany.mockResolvedValue([
      { totalAmount: 2_000_000n, paymentIntents: [{ paidAmount: 800_000n }] },
      { totalAmount: 1_500_000n, paymentIntents: [] },
    ]);
    const service = new ReportsService(prisma as never);

    const result = await service.revenue({ from: FROM, to: TO });

    expect(result.roomRevenue).toBe('1000000');
    expect(result.bbqRevenue).toBe('300000');
    expect(result.totalCollected).toBe('1300000');
    expect(result.totalBookingValue).toBe('3500000');
    expect(result.outstandingBalance).toBe('2700000');
    expect(result.discount).toBe('0');
  });

  it('never returns a negative outstanding balance', async () => {
    const prisma = prismaMock();
    prisma.booking.findMany.mockResolvedValue([{ totalAmount: 100n, paymentIntents: [{ paidAmount: 500n }] }]);
    const service = new ReportsService(prisma as never);

    const result = await service.revenue({ from: FROM, to: TO });

    expect(result.outstandingBalance).toBe('0');
  });
});

describe('ReportsService.occupancy', () => {
  it('subtracts blocked rooms from available room-nights only on the days the block covers', async () => {
    const prisma = prismaMock();
    prisma.room.count.mockResolvedValue(10);
    prisma.roomBlock.findMany.mockResolvedValue([
      { roomId: 'room-1', startDate: new Date('2026-08-02T00:00:00.000Z'), endDate: new Date('2026-08-04T00:00:00.000Z') },
    ]);
    prisma.roomOccupancy.groupBy.mockResolvedValue([
      { stayDate: new Date('2026-08-01T00:00:00.000Z'), _count: { _all: 4 } },
    ]);
    const service = new ReportsService(prisma as never);

    const result = await service.occupancy({ from: FROM, to: TO });

    expect(result.days).toHaveLength(7);
    const day1 = result.days.find((d) => d.date === '2026-08-01');
    const day2 = result.days.find((d) => d.date === '2026-08-02');
    const day4 = result.days.find((d) => d.date === '2026-08-04');
    expect(day1).toEqual({ date: '2026-08-01', occupiedRooms: 4, availableRooms: 10, occupancyRate: 40 });
    expect(day2?.availableRooms).toBe(9);
    expect(day4?.availableRooms).toBe(10); // endDate is exclusive
  });
});

describe('ReportsService.bbq', () => {
  it('counts every status but only sums revenue for confirmed-or-later reservations', async () => {
    const prisma = prismaMock();
    prisma.bbqReservation.findMany.mockResolvedValue([
      { status: 'CONFIRMED', itemsAmount: 200_000n, depositAmount: 150_000n },
      { status: 'PENDING_PAYMENT', itemsAmount: 100_000n, depositAmount: 150_000n },
      { status: 'CANCELLED', itemsAmount: 50_000n, depositAmount: 150_000n },
    ]);
    const service = new ReportsService(prisma as never);

    const result = await service.bbq({ from: FROM, to: TO });

    expect(result.total).toBe(3);
    expect(result.byStatus).toEqual({ CONFIRMED: 1, PENDING_PAYMENT: 1, CANCELLED: 1 });
    expect(result.itemsRevenue).toBe('200000');
    expect(result.depositRevenue).toBe('150000');
  });
});

describe('ReportsService.payments', () => {
  it('tallies payment intents and reconciliation cases independently', async () => {
    const prisma = prismaMock();
    prisma.paymentIntent.findMany.mockResolvedValue([{ status: 'PAID' }, { status: 'PAID' }, { status: 'EXPIRED' }]);
    prisma.reconciliationCase.findMany.mockResolvedValue([
      { status: 'OPEN', reason: 'AMOUNT_MISMATCH' },
      { status: 'RESOLVED', reason: 'AMOUNT_MISMATCH' },
    ]);
    const service = new ReportsService(prisma as never);

    const result = await service.payments({ from: FROM, to: TO });

    expect(result.paymentsByStatus).toEqual({ PAID: 2, EXPIRED: 1 });
    expect(result.reconciliationByStatus).toEqual({ OPEN: 1, RESOLVED: 1 });
    expect(result.reconciliationByReason).toEqual({ AMOUNT_MISMATCH: 2 });
  });
});
