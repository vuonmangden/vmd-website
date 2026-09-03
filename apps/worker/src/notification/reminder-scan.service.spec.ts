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

describe('ReminderScanService lifecycle', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  /** A leaked rejection here terminates the worker instead of retrying next tick. */
  it('survives a failing scan without leaking an unhandled rejection, and keeps scanning', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => { unhandled.push(reason); };
    process.on('unhandledRejection', onUnhandled);

    const prisma = prismaMock();
    prisma.booking.findMany.mockRejectedValue(new Error('database is unavailable'));
    const service = new ReminderScanService(prisma as never, jobsMock() as never);
    const logged = jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    service.onModuleInit();
    jest.advanceTimersByTime(60 * 60_000);
    await Promise.resolve();
    await Promise.resolve();

    process.off('unhandledRejection', onUnhandled);
    expect(unhandled).toEqual([]);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('database is unavailable'));

    service.onModuleDestroy();
    logged.mockRestore();
  });
});
