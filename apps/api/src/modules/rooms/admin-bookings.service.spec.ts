import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminBookingsService } from './admin-bookings.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const CORRELATION_ID = '00000000-0000-4000-8000-00000000000b';

const ACTOR: AuthenticatedActor = {
  staffProfileId: '00000000-0000-4000-8000-000000000001',
  authUserId: '00000000-0000-4000-8000-000000000002',
  fullName: 'Test Staff',
  email: 'staff@example.com',
  roles: ['MANAGER'],
  permissions: ['booking.read', 'booking.update', 'booking.cancel'],
};

function prismaMock() {
  const booking = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ status: 'PENDING_PAYMENT' }),
    count: jest.fn().mockResolvedValue(0),
  };
  const auditLog = { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const tx = { booking, auditLog };
  return {
    booking,
    auditLog,
    tx,
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : [[], 0],
    ),
  };
}

function stateMock() {
  return {
    transitionInTransaction: jest
      .fn()
      .mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED' }),
  };
}

describe('AdminBookingsService.list', () => {
  it('filters by status and check-in range', async () => {
    const prisma = prismaMock();
    const service = new AdminBookingsService(prisma as never, stateMock() as never);

    await service.list({
      status: 'CONFIRMED',
      checkInFrom: new Date('2026-09-01T00:00:00Z'),
      checkInTo: new Date('2026-09-30T00:00:00Z'),
      page: 2,
      pageSize: 20,
    });

    const where = prisma.booking.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('CONFIRMED');
    expect(where.checkInDate.gte).toEqual(new Date('2026-09-01T00:00:00Z'));
    expect(where.checkInDate.lte).toEqual(new Date('2026-09-30T00:00:00Z'));
    expect(prisma.booking.findMany.mock.calls[0][0].skip).toBe(20);
  });

  it('omits the filter when no status is given', async () => {
    const prisma = prismaMock();
    const service = new AdminBookingsService(prisma as never, stateMock() as never);

    await service.list({ page: 1, pageSize: 50 });

    expect(prisma.booking.findMany.mock.calls[0][0].where).toEqual({});
  });

  it('serialises money as an integer string', async () => {
    const prisma = prismaMock();
    prisma.$transaction = jest.fn().mockResolvedValue([
      [
        {
          id: 'booking-1',
          bookingCode: 'VMD-1',
          status: 'CONFIRMED',
          checkInDate: new Date('2026-09-01'),
          checkOutDate: new Date('2026-09-03'),
          adults: 2,
          children: 0,
          totalAmount: 2_400_000n,
          depositRequiredAmount: 1_200_000n,
          depositPolicy: 'STANDARD_50',
          dateChangeCount: 0,
          currency: 'VND',
          createdAt: new Date(),
          customer: { id: 'customer-1', fullName: 'Nguyễn Văn A' },
        },
      ],
      1,
    ]);
    const service = new AdminBookingsService(prisma as never, stateMock() as never);

    const result = await service.list({ page: 1, pageSize: 50 });

    expect(result.items[0]?.totalAmount).toBe('2400000');
    expect(result.items[0]?.depositRequiredAmount).toBe('1200000');
    expect(typeof result.items[0]?.totalAmount).toBe('string');
  });
});

describe('AdminBookingsService.detail', () => {
  it('returns 404 for an unknown booking', async () => {
    const prisma = prismaMock();
    prisma.booking.findUnique.mockResolvedValue(null);
    const service = new AdminBookingsService(prisma as never, stateMock() as never);

    await expect(service.detail('missing')).rejects.toThrow(NotFoundException);
  });

  it('requests status history newest first', async () => {
    const prisma = prismaMock();
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      totalAmount: 100n,
      depositRequiredAmount: 50n,
      rooms: [{ id: 'booking-room-1', amount: 100n }],
      statusHistory: [{ toStatus: 'CONFIRMED' }],
    });
    const service = new AdminBookingsService(prisma as never, stateMock() as never);

    const result = await service.detail('booking-1');

    expect(prisma.booking.findUnique.mock.calls[0][0].select.statusHistory).toEqual({
      orderBy: { changedAt: 'desc' },
    });
    expect(result).toEqual(expect.objectContaining({
      totalAmount: '100',
      depositRequiredAmount: '50',
      rooms: [expect.objectContaining({ amount: '100' })],
    }));
  });
});

describe('AdminBookingsService.transition', () => {
  it('delegates to the booking state machine rather than writing status directly', async () => {
    const prisma = prismaMock();
    const state = stateMock();
    const service = new AdminBookingsService(prisma as never, state as never);

    await service.transition(ACTOR, 'booking-1', 'CONFIRMED', undefined, CORRELATION_ID);

    expect(state.transitionInTransaction).toHaveBeenCalledWith(
      prisma.tx,
      'booking-1',
      'CONFIRMED',
      undefined,
    );
  });

  it('writes the audit record inside the same transaction', async () => {
    const prisma = prismaMock();
    const service = new AdminBookingsService(prisma as never, stateMock() as never);

    await service.transition(ACTOR, 'booking-1', 'CONFIRMED', undefined, CORRELATION_ID);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'booking.confirmed',
        resourceType: 'booking',
        resourceId: 'booking-1',
        beforeData: { status: 'PENDING_PAYMENT' },
        afterData: { status: 'CONFIRMED' },
        correlationId: CORRELATION_ID,
      }),
    });
  });

  it('rejects a transition outside the admin set', async () => {
    const service = new AdminBookingsService(prismaMock() as never, stateMock() as never);

    for (const status of ['CHECKED_IN', 'CHECKED_OUT', 'EXPIRED', 'REFUNDED']) {
      await expect(
        service.transition(ACTOR, 'booking-1', status, 'reason', CORRELATION_ID),
      ).rejects.toThrow(BadRequestException);
    }
  });

  it('requires a reason to cancel', async () => {
    const service = new AdminBookingsService(prismaMock() as never, stateMock() as never);

    await expect(
      service.transition(ACTOR, 'booking-1', 'CANCELLED', undefined, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.transition(ACTOR, 'booking-1', 'CANCELLED', '   ', CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts a cancellation with a reason and records it', async () => {
    const prisma = prismaMock();
    const service = new AdminBookingsService(prisma as never, stateMock() as never);

    await service.transition(ACTOR, 'booking-1', 'CANCELLED', 'Khách đổi kế hoạch', CORRELATION_ID);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'booking.cancelled',
        reason: 'Khách đổi kế hoạch',
      }),
    });
  });

  it('returns 404 when the booking does not exist', async () => {
    const prisma = prismaMock();
    prisma.booking.findUnique.mockResolvedValue(null);
    const service = new AdminBookingsService(prisma as never, stateMock() as never);

    await expect(
      service.transition(ACTOR, 'missing', 'CONFIRMED', undefined, CORRELATION_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('records the acting staff as the audit actor, not client input', async () => {
    const prisma = prismaMock();
    const service = new AdminBookingsService(prisma as never, stateMock() as never);

    await service.transition(ACTOR, 'booking-1', 'CONFIRMED', undefined, CORRELATION_ID);

    expect(prisma.auditLog.create.mock.calls[0][0].data.actorId).toBe(
      '00000000-0000-4000-8000-000000000001',
    );
    expect(prisma.auditLog.create.mock.calls[0][0].data.actorType).toBe('STAFF');
  });
});
