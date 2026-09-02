import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BbqReservationCreationService } from './bbq-reservation-creation.service';

const now = new Date('2026-08-22T05:00:00.000Z');
const CUSTOMER_ID = '00000000-0000-4000-8000-000000000001';
const TABLE_ID = '00000000-0000-4000-8000-000000000002';
const AREA_ID = '00000000-0000-4000-8000-000000000003';
const RESERVATION_ID = '00000000-0000-4000-8000-000000000004';

// 2026-08-22 is a Saturday, matching the seeded slots' every-day coverage.
const BASE_INPUT = {
  customerId: CUSTOMER_ID,
  tableId: TABLE_ID,
  date: '2026-08-22',
  startTime: '12:00',
  endTime: '13:00',
  adults: 4,
  children: 0,
  items: [] as { type: 'MENU_ITEM' | 'COMBO'; code: string; quantity: number }[],
  idempotencyKey: 'sandbox-bbq-reservation-key',
};

const LUNCH_SLOT = {
  areaId: null,
  startTime: '11:00',
  endTime: '14:00',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  dateFrom: null,
  dateTo: null,
};

function fakeTable(overrides?: Record<string, unknown>) {
  return {
    id: TABLE_ID,
    areaId: AREA_ID,
    code: 'VUON_THONG-01',
    minCapacity: 1,
    maxCapacity: 6,
    status: 'ACTIVE',
    deletedAt: null,
    ...overrides,
  };
}

function fakeReservation(overrides?: Record<string, unknown>) {
  return {
    id: RESERVATION_ID,
    reservationCode: 'BBQ-ABCD1234',
    status: 'PENDING_CONFIRMATION',
    currency: 'VND',
    ...overrides,
  };
}

function prismaMock() {
  const tx = {
    idempotencyKey: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    bbqTable: { findFirst: jest.fn().mockResolvedValue(fakeTable()) },
    bbqServiceSlot: { findMany: jest.fn().mockResolvedValue([LUNCH_SLOT]) },
    bbqReservation: { create: jest.fn().mockResolvedValue(fakeReservation()) },
    bbqReservationTable: { create: jest.fn() },
    bbqReservationItem: { createMany: jest.fn() },
    bbqReservationStatusHistory: { create: jest.fn() },
    resourceHold: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };
  return { tx, prisma: { $transaction: jest.fn((op: (t: typeof tx) => unknown) => op(tx)) } };
}

function bbqMenuMock(overrides?: Record<string, unknown>) {
  return {
    snapshotPrices: jest.fn().mockResolvedValue({
      items: [{ code: 'GOI_BO', name: 'Gỏi bò', unit: 'đĩa', price: '119000' }],
      combos: [{ code: 'SET_TU_KHOAI', name: 'Set nướng Tứ Khoái', price: '369000' }],
      snapshotAt: now,
      ...overrides,
    }),
  };
}

describe('BbqReservationCreationService.create', () => {
  it('creates reservation, table hold, status history, idempotency key and outbox in one transaction', async () => {
    const { tx, prisma } = prismaMock();
    const bbqMenu = bbqMenuMock();
    const service = new BbqReservationCreationService(prisma as never, bbqMenu as never, () => now);

    const result = await service.create(BASE_INPUT);

    expect(result).toEqual(
      expect.objectContaining({
        reservationId: RESERVATION_ID,
        reservationCode: 'BBQ-ABCD1234',
        status: 'PENDING_CONFIRMATION',
        tableId: TABLE_ID,
        depositAmount: '0',
        itemsAmount: '0',
      }),
    );
    expect(tx.bbqReservationTable.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reservationId: RESERVATION_ID, tableId: TABLE_ID, status: 'ACTIVE' }) }),
    );
    expect(tx.resourceHold.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ resourceType: 'BBQ_TABLE', resourceId: TABLE_ID, referenceType: 'BBQ_RESERVATION', status: 'ACTIVE' }),
      }),
    );
    expect(tx.bbqReservationStatusHistory.create).toHaveBeenCalledWith({
      data: { reservationId: RESERVATION_ID, toStatus: 'PENDING_CONFIRMATION', reason: 'reservation created awaiting confirmation' },
    });
    expect(tx.idempotencyKey.create).toHaveBeenCalled();
    expect(tx.outboxEvent.create).toHaveBeenCalled();
    expect(tx.bbqReservationItem.createMany).not.toHaveBeenCalled();
  });

  it('returns the cached response on idempotent replay without creating anything new', async () => {
    const { tx, prisma } = prismaMock();
    const cached = { reservationId: 'prior' };
    tx.idempotencyKey.findUnique.mockResolvedValue({ responseBody: cached });
    const service = new BbqReservationCreationService(prisma as never, bbqMenuMock() as never, () => now);

    await expect(service.create(BASE_INPUT)).resolves.toEqual(cached);
    expect(tx.bbqReservation.create).not.toHaveBeenCalled();
  });

  it('snapshots menu items and combos, computing line totals and itemsAmount', async () => {
    const { tx, prisma } = prismaMock();
    const bbqMenu = bbqMenuMock();
    const service = new BbqReservationCreationService(prisma as never, bbqMenu as never, () => now);

    await service.create({
      ...BASE_INPUT,
      items: [
        { type: 'MENU_ITEM', code: 'GOI_BO', quantity: 2 },
        { type: 'COMBO', code: 'SET_TU_KHOAI', quantity: 1 },
      ],
    });

    expect(bbqMenu.snapshotPrices).toHaveBeenCalledWith({ itemCodes: ['GOI_BO'], comboCodes: ['SET_TU_KHOAI'] }, tx);
    expect(tx.bbqReservationItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ code: 'GOI_BO', unitPrice: 119000n, quantity: 2, lineTotal: 238000n, unitSnapshot: 'đĩa' }),
        expect.objectContaining({ code: 'SET_TU_KHOAI', unitPrice: 369000n, quantity: 1, lineTotal: 369000n, unitSnapshot: null }),
      ],
    });
    // 238000 + 369000
    expect(tx.bbqReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ itemsAmount: 607000n }) }),
    );
  });

  it('throws NotFoundException for a missing or inactive table', async () => {
    const { tx, prisma } = prismaMock();
    tx.bbqTable.findFirst.mockResolvedValue(null);
    const service = new BbqReservationCreationService(prisma as never, bbqMenuMock() as never, () => now);

    await expect(service.create(BASE_INPUT)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when guest count does not fit the table', async () => {
    const { prisma } = prismaMock();
    const service = new BbqReservationCreationService(prisma as never, bbqMenuMock() as never, () => now);

    await expect(service.create({ ...BASE_INPUT, adults: 20 })).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when the requested time is outside service hours', async () => {
    const { tx, prisma } = prismaMock();
    tx.bbqServiceSlot.findMany.mockResolvedValue([{ ...LUNCH_SLOT, startTime: '18:00', endTime: '22:00' }]);
    const service = new BbqReservationCreationService(prisma as never, bbqMenuMock() as never, () => now);

    await expect(service.create(BASE_INPUT)).rejects.toThrow(BadRequestException);
  });

  it('propagates BbqMenuService errors for an unknown/unavailable code', async () => {
    const { prisma } = prismaMock();
    const bbqMenu = { snapshotPrices: jest.fn().mockRejectedValue(new NotFoundException({ code: 'BBQ_MENU_ENTRY_UNAVAILABLE' })) };
    const service = new BbqReservationCreationService(prisma as never, bbqMenu as never, () => now);

    await expect(
      service.create({ ...BASE_INPUT, items: [{ type: 'MENU_ITEM', code: 'UNKNOWN', quantity: 1 }] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects invalid input before touching the database', async () => {
    const { tx, prisma } = prismaMock();
    const service = new BbqReservationCreationService(prisma as never, bbqMenuMock() as never, () => now);

    await expect(service.create({ ...BASE_INPUT, adults: 0 })).rejects.toThrow(BadRequestException);
    await expect(service.create({ ...BASE_INPUT, startTime: '13:00', endTime: '12:00' })).rejects.toThrow(BadRequestException);
    await expect(service.create({ ...BASE_INPUT, idempotencyKey: '  ' })).rejects.toThrow(BadRequestException);
    expect(tx.bbqTable.findFirst).not.toHaveBeenCalled();
  });

  it('maps a unique-constraint violation to ConflictException', async () => {
    const { tx, prisma } = prismaMock();
    tx.bbqReservation.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2002', clientVersion: '7.7.0' }),
    );
    const service = new BbqReservationCreationService(prisma as never, bbqMenuMock() as never, () => now);

    await expect(service.create(BASE_INPUT)).rejects.toThrow(ConflictException);
  });

  it('maps an exclusion-constraint violation to a table-conflict error', async () => {
    const { tx, prisma } = prismaMock();
    tx.bbqReservationTable.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2004', clientVersion: '7.7.0' }),
    );
    const service = new BbqReservationCreationService(prisma as never, bbqMenuMock() as never, () => now);

    await expect(service.create(BASE_INPUT)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'BBQ_TABLE_CONFLICT' }) });
  });
});
