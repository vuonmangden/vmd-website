import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CheckInOutService } from './check-in-out.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const CORRELATION_ID = '00000000-0000-4000-8000-00000000000c';

const ACTOR: AuthenticatedActor = {
  staffProfileId: '00000000-0000-4000-8000-000000000001',
  authUserId: '00000000-0000-4000-8000-000000000002',
  fullName: 'Reception Staff',
  email: 'reception@example.com',
  roles: ['RECEPTION'],
  permissions: ['booking.checkin', 'booking.checkout', 'booking.read'],
};

function prismaMock(status = 'CONFIRMED') {
  const booking = {
    findUnique: jest.fn().mockResolvedValue({
      status,
      checkInDate: new Date('2026-09-01'),
      checkOutDate: new Date('2026-09-03'),
    }),
    findMany: jest.fn().mockResolvedValue([]),
  };
  const auditLog = { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const tx = { booking, auditLog };
  return {
    booking,
    auditLog,
    tx,
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : [[], []],
    ),
  };
}

function stateMock(status: string) {
  return {
    transitionInTransaction: jest.fn().mockResolvedValue({ id: 'booking-1', status }),
  };
}

describe('CheckInOutService.checkIn', () => {
  it('checks a confirmed booking in through the state machine', async () => {
    const prisma = prismaMock('CONFIRMED');
    const state = stateMock('CHECKED_IN');
    const service = new CheckInOutService(prisma as never, state as never);

    const result = await service.checkIn(ACTOR, 'booking-1', undefined, CORRELATION_ID);

    expect(result).toEqual({ id: 'booking-1', status: 'CHECKED_IN' });
    expect(state.transitionInTransaction).toHaveBeenCalledWith(
      prisma.tx,
      'booking-1',
      'CHECKED_IN',
      undefined,
    );
  });

  it('refuses to check in a booking that is not confirmed', async () => {
    for (const status of ['PENDING_PAYMENT', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT']) {
      const service = new CheckInOutService(prismaMock(status) as never, stateMock('CHECKED_IN') as never);
      await expect(
        service.checkIn(ACTOR, 'booking-1', undefined, CORRELATION_ID),
      ).rejects.toThrow(BadRequestException);
    }
  });

  it('writes the audit record inside the same transaction', async () => {
    const prisma = prismaMock('CONFIRMED');
    const service = new CheckInOutService(prisma as never, stateMock('CHECKED_IN') as never);

    await service.checkIn(ACTOR, 'booking-1', 'Khách đến sớm', CORRELATION_ID);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'STAFF',
        actorId: '00000000-0000-4000-8000-000000000001',
        action: 'booking.check_in',
        resourceType: 'booking',
        beforeData: { status: 'CONFIRMED' },
        afterData: { status: 'CHECKED_IN' },
        reason: 'Khách đến sớm',
        correlationId: CORRELATION_ID,
      }),
    });
  });

  it('returns 404 for an unknown booking', async () => {
    const prisma = prismaMock();
    prisma.booking.findUnique.mockResolvedValue(null);
    const service = new CheckInOutService(prisma as never, stateMock('CHECKED_IN') as never);

    await expect(
      service.checkIn(ACTOR, 'missing', undefined, CORRELATION_ID),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('CheckInOutService.checkOut', () => {
  it('checks a checked-in booking out', async () => {
    const prisma = prismaMock('CHECKED_IN');
    const state = stateMock('CHECKED_OUT');
    const service = new CheckInOutService(prisma as never, state as never);

    const result = await service.checkOut(ACTOR, 'booking-1', undefined, CORRELATION_ID);

    expect(result).toEqual({ id: 'booking-1', status: 'CHECKED_OUT' });
    expect(state.transitionInTransaction).toHaveBeenCalledWith(
      prisma.tx,
      'booking-1',
      'CHECKED_OUT',
      undefined,
    );
  });

  it('refuses to check out a booking that was never checked in', async () => {
    for (const status of ['CONFIRMED', 'PENDING_PAYMENT', 'CHECKED_OUT']) {
      const service = new CheckInOutService(prismaMock(status) as never, stateMock('CHECKED_OUT') as never);
      await expect(
        service.checkOut(ACTOR, 'booking-1', undefined, CORRELATION_ID),
      ).rejects.toThrow(BadRequestException);
    }
  });

  it('records a check-out audit action', async () => {
    const prisma = prismaMock('CHECKED_IN');
    const service = new CheckInOutService(prisma as never, stateMock('CHECKED_OUT') as never);

    await service.checkOut(ACTOR, 'booking-1', undefined, CORRELATION_ID);

    expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe('booking.check_out');
  });
});

describe('CheckInOutService.dailyMovements', () => {
  it('queries arrivals and departures for the given date', async () => {
    const prisma = prismaMock();
    const service = new CheckInOutService(prisma as never, stateMock('CHECKED_IN') as never);
    const date = new Date('2026-09-01T00:00:00.000Z');

    const result = await service.dailyMovements(date);

    expect(result.date).toEqual(date);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('limits arrivals and departures to the relevant statuses', async () => {
    const prisma = prismaMock();
    const service = new CheckInOutService(prisma as never, stateMock('CHECKED_IN') as never);
    const date = new Date('2026-09-01T00:00:00.000Z');

    await service.dailyMovements(date);

    const [arrivalsQuery, departuresQuery] = prisma.booking.findMany.mock.calls.map(
      (call: unknown[]) => call[0] as { where: Record<string, unknown> },
    );

    expect(arrivalsQuery?.where).toEqual({
      checkInDate: date,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
    });
    expect(departuresQuery?.where).toEqual({
      checkOutDate: date,
      status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
    });
  });
});
