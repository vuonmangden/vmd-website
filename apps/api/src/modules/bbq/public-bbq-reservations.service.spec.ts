import { BadRequestException, ConflictException } from '@nestjs/common';
import { PublicBbqReservationsService } from './public-bbq-reservations.service';

const now = new Date('2026-09-02T05:00:00.000Z');
const CUSTOMER_ID = '00000000-0000-4000-8000-000000000005';
const RESERVATION_ID = '00000000-0000-4000-8000-000000000004';
const VALID: Parameters<PublicBbqReservationsService['create']>[0] = { date: '2026-09-02', startTime: '12:00', fullName: 'Nguyễn Văn A', phone: '0901234567', adults: 4, children: 0 };
const SLOT = { startTime: '10:30', endTime: '21:30', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], dateFrom: null, dateTo: null };

function prismaMock(used = 0) {
  const tx = {
    idempotencyKey: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    bbqServiceSlot: { findMany: jest.fn().mockResolvedValue([SLOT]) },
    $executeRaw: jest.fn(),
    bbqReservation: { aggregate: jest.fn().mockResolvedValue({ _sum: { adults: used, children: 0 } }), create: jest.fn().mockResolvedValue({ id: RESERVATION_ID, reservationCode: 'BBQ-ABCD1234' }) },
    customer: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: CUSTOMER_ID, createdAt: now }), update: jest.fn() },
    bbqReservationItem: { createMany: jest.fn() },
    bbqReservationStatusHistory: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };
  return { tx, prisma: { $transaction: jest.fn((op: (value: typeof tx) => unknown) => op(tx)) } };
}
function menu() { return { snapshotPrices: jest.fn().mockResolvedValue({ items: [], combos: [] }) }; }

describe('PublicBbqReservationsService.create', () => {
  it('creates a pending-confirmation request without a table, hold, or payment intent', async () => {
    const { tx, prisma } = prismaMock();
    const service = new PublicBbqReservationsService(prisma as never, menu() as never, () => now);
    await expect(service.create(VALID, 'checkout-key', { correlationId: 'corr-1' })).resolves.toEqual({ reservationCode: 'BBQ-ABCD1234', status: 'PENDING_CONFIRMATION', confirmationRequired: true });
    expect(tx.bbqReservation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING_CONFIRMATION', depositAmount: 0n, endTime: '21:30' }) }));
    expect(tx.$executeRaw).toHaveBeenCalled();
  });

  it('rejects a request exceeding the 120-person daily quota', async () => {
    const { prisma } = prismaMock(118);
    const service = new PublicBbqReservationsService(prisma as never, menu() as never, () => now);
    await expect(service.create({ ...VALID, adults: 3 }, 'quota-key', {})).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps an idempotent replay but rejects the same key with changed payload', async () => {
    const { tx, prisma } = prismaMock();
    tx.idempotencyKey.findUnique.mockResolvedValue({ requestHash: 'other', responseBody: { reservationCode: 'BBQ-CACHED' } });
    const service = new PublicBbqReservationsService(prisma as never, menu() as never, () => now);
    await expect(service.create(VALID, 'reused-key', {})).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects 21 guests and arrivals outside service hours before creating a reservation', async () => {
    const { prisma } = prismaMock();
    const service = new PublicBbqReservationsService(prisma as never, menu() as never, () => now);
    await expect(service.create({ ...VALID, adults: 21 }, 'too-many', {})).rejects.toBeInstanceOf(BadRequestException);
  });
});
