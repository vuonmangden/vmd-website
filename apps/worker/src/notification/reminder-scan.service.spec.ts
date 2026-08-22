import { ReminderScanService } from './reminder-scan.service';

function prismaMock() {
  return { booking: { findMany: jest.fn().mockResolvedValue([]) } };
}

function jobsMock() {
  return { enqueueBookingReminder: jest.fn().mockResolvedValue(undefined) };
}

describe('ReminderScanService.scan', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-25T04:00:00.000Z')); // 11:00 in Asia/Ho_Chi_Minh
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('queries check-in dates exactly 7/3/1 operational days ahead of today, in that order', async () => {
    const prisma = prismaMock();
    const service = new ReminderScanService(prisma as never, jobsMock() as never);

    await service.scan();

    const queriedDates = prisma.booking.findMany.mock.calls.map((call) => (call[0].where.checkInDate as Date).toISOString().slice(0, 10));
    expect(queriedDates).toEqual(['2026-09-01', '2026-08-28', '2026-08-26']);
  });

  it('only ever queries CONFIRMED bookings', async () => {
    const prisma = prismaMock();
    const service = new ReminderScanService(prisma as never, jobsMock() as never);

    await service.scan();

    for (const call of prisma.booking.findMany.mock.calls) {
      expect(call[0].where.status).toBe('CONFIRMED');
    }
  });

  it('enqueues a reminder per matching booking, scheduled for 10:00 Asia/Ho_Chi_Minh today', async () => {
    const prisma = prismaMock();
    prisma.booking.findMany.mockResolvedValueOnce([{ id: 'booking-1' }]).mockResolvedValue([]);
    const jobs = jobsMock();
    const service = new ReminderScanService(prisma as never, jobs as never);

    const enqueued = await service.scan();

    expect(enqueued).toBe(1);
    expect(jobs.enqueueBookingReminder).toHaveBeenCalledWith('booking-1', 7, new Date('2026-08-25T03:00:00.000Z'));
  });
});
