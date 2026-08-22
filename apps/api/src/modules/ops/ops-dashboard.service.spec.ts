import { OpsDashboardService } from './ops-dashboard.service';

function prismaMock() {
  return {
    booking: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    bbqReservation: { count: jest.fn().mockResolvedValue(0) },
    reconciliationCase: { count: jest.fn().mockResolvedValue(0) },
    paymentIntent: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { paidAmount: null } }),
    },
    notificationJob: { count: jest.fn().mockResolvedValue(0) },
    contactSubmission: { count: jest.fn().mockResolvedValue(0) },
    room: { count: jest.fn().mockResolvedValue(0) },
    roomOccupancy: { groupBy: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((arg: unknown) => (Array.isArray(arg) ? Promise.all(arg) : arg)),
  };
}

describe('OpsDashboardService.summary', () => {
  it('splits arrivals and departures into scheduled vs already-completed counts', async () => {
    const prisma = prismaMock();
    prisma.booking.findMany
      .mockResolvedValueOnce([
        { status: 'CONFIRMED' },
        { status: 'CHECKED_IN' },
        { status: 'CHECKED_IN' },
      ])
      .mockResolvedValueOnce([{ status: 'CHECKED_IN' }, { status: 'CHECKED_OUT' }]);
    const service = new OpsDashboardService(prisma as never);

    const result = await service.summary(new Date('2026-08-22T00:00:00.000Z'));

    expect(result.bookings.arrivalsToday).toBe(3);
    expect(result.bookings.checkedInToday).toBe(2);
    expect(result.bookings.departuresToday).toBe(2);
    expect(result.bookings.checkedOutToday).toBe(1);
  });

  it('serialises payment sums as integer strings, defaulting to zero', async () => {
    const prisma = prismaMock();
    prisma.paymentIntent.aggregate
      .mockResolvedValueOnce({ _sum: { paidAmount: 500_000n } })
      .mockResolvedValueOnce({ _sum: { paidAmount: null } });
    const service = new OpsDashboardService(prisma as never);

    const result = await service.summary(new Date('2026-08-22T00:00:00.000Z'));

    expect(result.payments.revenueToday).toBe('500000');
    expect(typeof result.payments.revenueToday).toBe('string');
    expect(result.payments.depositsCollectedTotal).toBe('0');
  });

  it('fills a 7-day occupancy window, defaulting missing days to zero', async () => {
    const prisma = prismaMock();
    prisma.room.count.mockResolvedValue(10);
    prisma.roomOccupancy.groupBy.mockResolvedValue([
      { stayDate: new Date('2026-08-22T00:00:00.000Z'), _count: { _all: 4 } },
      { stayDate: new Date('2026-08-24T00:00:00.000Z'), _count: { _all: 2 } },
    ]);
    const service = new OpsDashboardService(prisma as never);

    const result = await service.summary(new Date('2026-08-22T00:00:00.000Z'));

    expect(result.occupancy).toHaveLength(7);
    expect(result.occupancy[0]).toEqual({
      date: '2026-08-22',
      occupiedRooms: 4,
      totalRooms: 10,
      occupancyRate: 40,
    });
    expect(result.occupancy[1]).toEqual({
      date: '2026-08-23',
      occupiedRooms: 0,
      totalRooms: 10,
      occupancyRate: 0,
    });
    expect(result.occupancy[6]?.date).toBe('2026-08-28');
  });

  it('scopes today-only revenue to the Asia/Ho_Chi_Minh operational day', async () => {
    const prisma = prismaMock();
    const service = new OpsDashboardService(prisma as never);

    await service.summary(new Date('2026-08-22T00:00:00.000Z'));

    const revenueWhere = prisma.paymentIntent.aggregate.mock.calls[0][0].where;
    expect(revenueWhere.updatedAt.gte).toEqual(new Date('2026-08-21T17:00:00.000Z'));
    expect(revenueWhere.updatedAt.lt).toEqual(new Date('2026-08-22T17:00:00.000Z'));
  });

  it('maps each domain counter to its own field without mixing them up', async () => {
    const prisma = prismaMock();
    prisma.bbqReservation.count.mockResolvedValue(5);
    prisma.booking.count.mockResolvedValueOnce(11).mockResolvedValueOnce(3);
    prisma.reconciliationCase.count.mockResolvedValue(2);
    prisma.notificationJob.count.mockResolvedValue(7);
    prisma.contactSubmission.count.mockResolvedValue(9);
    const service = new OpsDashboardService(prisma as never);

    const result = await service.summary(new Date('2026-08-22T00:00:00.000Z'));

    expect(result.bbq.reservationsToday).toBe(5);
    expect(result.bookings.pendingPayment).toBe(11);
    expect(result.bookings.unconfirmedArrivalsToday).toBe(3);
    expect(result.payments.reconciliationOpen).toBe(2);
    expect(result.notifications.failed).toBe(7);
    expect(result.contact.unhandled).toBe(9);
  });
});
