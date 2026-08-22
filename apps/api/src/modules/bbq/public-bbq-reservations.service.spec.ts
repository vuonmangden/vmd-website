import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PublicBbqReservationsService } from './public-bbq-reservations.service';

const now = new Date('2026-08-22T05:00:00.000Z');
const TABLE_ID = '00000000-0000-4000-8000-000000000002';
const AREA_ID = '00000000-0000-4000-8000-000000000003';
const RESERVATION_ID = '00000000-0000-4000-8000-000000000004';
const CUSTOMER_ID = '00000000-0000-4000-8000-000000000005';

// 2026-08-22 is a Saturday, matching the seeded slots' every-day coverage.
const VALID: Parameters<PublicBbqReservationsService['create']>[0] = {
  tableId: TABLE_ID,
  date: '2026-08-22',
  startTime: '12:00',
  endTime: '13:00',
  fullName: 'Nguyễn Văn A',
  phone: '0901234567',
  adults: 4,
  children: 0,
};

const LUNCH_SLOT = { areaId: null, startTime: '11:00', endTime: '14:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], dateFrom: null, dateTo: null };

function fakeTable(overrides?: Record<string, unknown>) {
  return { id: TABLE_ID, areaId: AREA_ID, code: 'VUON_THONG-01', minCapacity: 1, maxCapacity: 6, status: 'ACTIVE', deletedAt: null, ...overrides };
}

function fakeReservation(overrides?: Record<string, unknown>) {
  return { id: RESERVATION_ID, reservationCode: 'BBQ-ABCD1234', status: 'PENDING_PAYMENT', currency: 'VND', ...overrides };
}

function prismaMock() {
  const tx = {
    idempotencyKey: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    bbqTable: { findFirst: jest.fn().mockResolvedValue(fakeTable()) },
    bbqServiceSlot: { findMany: jest.fn().mockResolvedValue([LUNCH_SLOT]) },
    appSetting: { findUnique: jest.fn().mockResolvedValue({ value: { amount: 150000 } }) },
    customer: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: CUSTOMER_ID, createdAt: now }), update: jest.fn() },
    bbqReservation: { create: jest.fn().mockResolvedValue(fakeReservation()) },
    bbqReservationTable: { create: jest.fn() },
    bbqReservationItem: { createMany: jest.fn() },
    bbqReservationStatusHistory: { create: jest.fn() },
    resourceHold: { create: jest.fn().mockResolvedValue({ id: 'hold-1' }) },
    outboxEvent: { create: jest.fn() },
  };
  return { tx, prisma: { $transaction: jest.fn((op: (t: typeof tx) => unknown) => op(tx)) } };
}

function bbqMenuMock(overrides?: Record<string, unknown>) {
  return { snapshotPrices: jest.fn().mockResolvedValue({ items: [], combos: [], ...overrides }) };
}

function paymentsMock() {
  return { createSandboxIntentForBbqCheckout: jest.fn().mockResolvedValue({ paymentIntentId: 'payment-1', expiresAt: '2026-08-22T07:00:00.000Z' }) };
}

describe('PublicBbqReservationsService.create', () => {
  it('rejects a phone outside the Vietnamese mobile policy before a database operation', async () => {
    const service = new PublicBbqReservationsService({ $transaction: jest.fn() } as never, {} as never, {} as never, () => now);
    await expect(service.create({ ...VALID, phone: '+12025550123' }, 'checkout-key', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a reservation, hold, customer and deposit payment intent in one transaction', async () => {
    const { tx, prisma } = prismaMock();
    const bbqMenu = bbqMenuMock();
    const payments = paymentsMock();
    const service = new PublicBbqReservationsService(prisma as never, bbqMenu as never, payments as never, () => now);

    const result = await service.create(VALID, 'checkout-key', { correlationId: 'corr-1' });

    expect(result).toEqual({ reservationCode: 'BBQ-ABCD1234', status: 'PENDING_PAYMENT', paymentReference: 'payment-1' });
    expect(tx.customer.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ phoneNormalized: '+84901234567', fullName: 'Nguyễn Văn A' }) }));
    expect(tx.bbqReservation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customerId: CUSTOMER_ID, source: 'PUBLIC', status: 'PENDING_PAYMENT' }) }));
    expect(tx.bbqReservationTable.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reservationId: RESERVATION_ID, tableId: TABLE_ID }) }));
    expect(payments.createSandboxIntentForBbqCheckout).toHaveBeenCalledWith(tx, expect.objectContaining({ id: RESERVATION_ID, depositAmount: 150000n }), 'hold-1', expect.objectContaining({ correlationId: 'corr-1' }));
    expect(tx.idempotencyKey.create).toHaveBeenCalled();
    expect(tx.outboxEvent.create).toHaveBeenCalled();
  });

  it('reuses an existing customer found by normalized phone instead of creating a new one', async () => {
    const { tx, prisma } = prismaMock();
    tx.customer.findFirst.mockResolvedValue({ id: 'existing-customer', createdAt: now });
    const service = new PublicBbqReservationsService(prisma as never, bbqMenuMock() as never, paymentsMock() as never, () => now);

    await service.create(VALID, 'checkout-key', {});

    expect(tx.customer.create).not.toHaveBeenCalled();
    expect(tx.bbqReservation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customerId: 'existing-customer' }) }));
  });

  it('returns the cached response on idempotent replay without creating anything new', async () => {
    const { tx, prisma } = prismaMock();
    const cached = { reservationCode: 'BBQ-CACHED' };
    tx.idempotencyKey.findUnique.mockResolvedValue({ responseBody: cached });
    const service = new PublicBbqReservationsService(prisma as never, bbqMenuMock() as never, paymentsMock() as never, () => now);

    await expect(service.create(VALID, 'checkout-key', {})).resolves.toEqual(cached);
    expect(tx.bbqReservation.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when guest count does not fit the table', async () => {
    const { prisma } = prismaMock();
    const service = new PublicBbqReservationsService(prisma as never, bbqMenuMock() as never, paymentsMock() as never, () => now);
    await expect(service.create({ ...VALID, adults: 20 }, 'checkout-key', {})).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when the requested time is outside service hours', async () => {
    const { tx, prisma } = prismaMock();
    tx.bbqServiceSlot.findMany.mockResolvedValue([{ ...LUNCH_SLOT, startTime: '18:00', endTime: '22:00' }]);
    const service = new PublicBbqReservationsService(prisma as never, bbqMenuMock() as never, paymentsMock() as never, () => now);
    await expect(service.create(VALID, 'checkout-key', {})).rejects.toThrow(BadRequestException);
  });

  it('maps an exclusion-constraint violation to a table-conflict error', async () => {
    const { tx, prisma } = prismaMock();
    tx.bbqReservationTable.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2004', clientVersion: '7.7.0' }));
    const service = new PublicBbqReservationsService(prisma as never, bbqMenuMock() as never, paymentsMock() as never, () => now);
    await expect(service.create(VALID, 'checkout-key', {})).rejects.toMatchObject({ response: expect.objectContaining({ code: 'BBQ_TABLE_CONFLICT' }) });
  });

  it('maps a unique-constraint violation to ConflictException', async () => {
    const { tx, prisma } = prismaMock();
    tx.bbqReservation.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2002', clientVersion: '7.7.0' }));
    const service = new PublicBbqReservationsService(prisma as never, bbqMenuMock() as never, paymentsMock() as never, () => now);
    await expect(service.create(VALID, 'checkout-key', {})).rejects.toThrow(ConflictException);
  });
});
