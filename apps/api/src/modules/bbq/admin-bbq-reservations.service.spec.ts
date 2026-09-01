import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminBbqReservationsService } from './admin-bbq-reservations.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const CORRELATION_ID = '00000000-0000-4000-8000-00000000000c';
const RESERVATION_ID = '00000000-0000-4000-8000-000000000010';

const ACTOR: AuthenticatedActor = {
  staffProfileId: '00000000-0000-4000-8000-000000000001',
  authUserId: '00000000-0000-4000-8000-000000000002',
  fullName: 'Manager',
  email: 'manager@example.com',
  roles: ['MANAGER'],
  permissions: ['bbq.manage'],
};

function fakeListRow(overrides?: Record<string, unknown>) {
  return {
    id: RESERVATION_ID,
    reservationCode: 'BBQ-ABCD1234',
    status: 'PENDING_PAYMENT',
    reservationDate: new Date('2026-08-22T00:00:00.000Z'),
    startTime: '12:00',
    endTime: '13:00',
    adults: 4,
    children: 0,
    itemsAmount: 238000n,
    depositAmount: 150000n,
    currency: 'VND',
    createdAt: new Date('2026-08-20T12:00:00.000Z'),
    customer: { id: 'cust-1', fullName: 'Nguyễn Văn A' },
    tables: [{ table: { code: 'VUON_THONG-01', name: 'Bàn 1' } }],
    ...overrides,
  };
}

function prismaMock() {
  const bbqReservation = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ status: 'PENDING_PAYMENT' }),
    count: jest.fn().mockResolvedValue(0),
  };
  const auditLog = { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const tx = { bbqReservation, auditLog };
  return {
    bbqReservation,
    auditLog,
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (t: typeof tx) => unknown)(tx)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
}

function stateMock() {
  return { transitionInTransaction: jest.fn().mockResolvedValue({ id: RESERVATION_ID, status: 'CONFIRMED' }) };
}

describe('AdminBbqReservationsService.list', () => {
  it('flattens customer/table fields and serializes BigInt amounts', async () => {
    const prisma = prismaMock();
    prisma.bbqReservation.findMany.mockResolvedValue([fakeListRow()]);
    prisma.bbqReservation.count.mockResolvedValue(1);
    const service = new AdminBbqReservationsService(prisma as never, stateMock() as never);

    const result = await service.list({ page: 1, pageSize: 50 });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: RESERVATION_ID,
        itemsAmount: '238000',
        depositAmount: '150000',
        tables: [{ code: 'VUON_THONG-01', name: 'Bàn 1' }],
      }),
    );
  });

  it('filters by status and reservation date range', async () => {
    const prisma = prismaMock();
    const service = new AdminBbqReservationsService(prisma as never, stateMock() as never);

    await service.list({
      status: 'CONFIRMED',
      reservationDateFrom: new Date('2026-09-01T00:00:00Z'),
      reservationDateTo: new Date('2026-09-30T00:00:00Z'),
      page: 2,
      pageSize: 20,
    });

    const where = prisma.bbqReservation.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('CONFIRMED');
    expect(where.reservationDate.gte).toEqual(new Date('2026-09-01T00:00:00Z'));
    expect(prisma.bbqReservation.findMany.mock.calls[0][0].skip).toBe(20);
  });
});

describe('AdminBbqReservationsService.calendar', () => {
  it('lists one date\'s CONFIRMED/CHECKED_IN/CHECKED_OUT reservations ordered by start time', async () => {
    const prisma = prismaMock();
    const date = new Date('2026-08-22T00:00:00.000Z');
    prisma.bbqReservation.findMany.mockResolvedValue([
      { id: RESERVATION_ID, reservationCode: 'BBQ-ABCD1234', status: 'CONFIRMED', startTime: '12:00', endTime: '13:00', adults: 4, children: 0, customer: { fullName: 'Nguyễn Văn A' }, tables: [{ table: { code: 'VUON_THONG-01', name: 'Bàn 1' }, area: { name: 'Vườn Thông' } }] },
    ]);
    const service = new AdminBbqReservationsService(prisma as never, stateMock() as never);

    const result = await service.calendar(date);

    expect(prisma.bbqReservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { reservationDate: date, status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] } }, orderBy: { startTime: 'asc' } }),
    );
    expect(result.reservations[0]).toEqual(
      expect.objectContaining({ id: RESERVATION_ID, tables: [{ code: 'VUON_THONG-01', name: 'Bàn 1', areaName: 'Vườn Thông' }] }),
    );
  });
});

describe('AdminBbqReservationsService.detail', () => {
  it('serializes BigInt fields on the reservation and its items', async () => {
    const prisma = prismaMock();
    prisma.bbqReservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      itemsAmount: 238000n,
      depositAmount: 150000n,
      items: [{ id: 'item-1', unitPrice: 119000n, quantity: 2, lineTotal: 238000n }],
      tables: [],
      statusHistory: [],
      customer: { id: 'cust-1', fullName: 'Nguyễn Văn A', customerCode: 'VMD-0001' },
    });
    const service = new AdminBbqReservationsService(prisma as never, stateMock() as never);

    const result = await service.detail(RESERVATION_ID);

    expect(result.itemsAmount).toBe('238000');
    expect(result.items[0]).toMatchObject({ unitPrice: '119000', lineTotal: '238000' });
  });

  it('throws NotFoundException for an unknown reservation', async () => {
    const prisma = prismaMock();
    prisma.bbqReservation.findUnique.mockResolvedValue(null);
    const service = new AdminBbqReservationsService(prisma as never, stateMock() as never);

    await expect(service.detail(RESERVATION_ID)).rejects.toThrow(NotFoundException);
  });
});

describe('AdminBbqReservationsService.transition', () => {
  it('confirms a reservation and writes an audit row', async () => {
    const prisma = prismaMock();
    const state = stateMock();
    const service = new AdminBbqReservationsService(prisma as never, state as never);

    const result = await service.transition(ACTOR, RESERVATION_ID, 'CONFIRMED', undefined, CORRELATION_ID);

    expect(state.transitionInTransaction).toHaveBeenCalledWith(expect.anything(), RESERVATION_ID, 'CONFIRMED', undefined);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'bbq_reservation.confirmed', correlationId: CORRELATION_ID }),
      }),
    );
    expect(result).toEqual({ id: RESERVATION_ID, status: 'CONFIRMED' });
  });

  it('requires a reason to cancel', async () => {
    const prisma = prismaMock();
    const service = new AdminBbqReservationsService(prisma as never, stateMock() as never);

    await expect(service.transition(ACTOR, RESERVATION_ID, 'CANCELLED', undefined, CORRELATION_ID)).rejects.toThrow(BadRequestException);
  });

  it('rejects a transition not exposed by this admin API', async () => {
    const prisma = prismaMock();
    const service = new AdminBbqReservationsService(prisma as never, stateMock() as never);

    await expect(service.transition(ACTOR, RESERVATION_ID, 'EXPIRED', 'x', CORRELATION_ID)).rejects.toThrow(BadRequestException);
  });

  it('checks a reservation in and out without requiring a reason', async () => {
    const prisma = prismaMock();
    const state = stateMock();
    state.transitionInTransaction.mockResolvedValue({ id: RESERVATION_ID, status: 'CHECKED_IN' });
    const service = new AdminBbqReservationsService(prisma as never, state as never);

    const result = await service.transition(ACTOR, RESERVATION_ID, 'CHECKED_IN', undefined, CORRELATION_ID);

    expect(state.transitionInTransaction).toHaveBeenCalledWith(expect.anything(), RESERVATION_ID, 'CHECKED_IN', undefined);
    expect(result).toEqual({ id: RESERVATION_ID, status: 'CHECKED_IN' });
  });

  it('throws NotFoundException for an unknown reservation', async () => {
    const prisma = prismaMock();
    prisma.bbqReservation.findUnique.mockResolvedValue(null);
    const service = new AdminBbqReservationsService(prisma as never, stateMock() as never);

    await expect(service.transition(ACTOR, RESERVATION_ID, 'CONFIRMED', undefined, CORRELATION_ID)).rejects.toThrow(NotFoundException);
  });
});
