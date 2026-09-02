import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { BookingPolicyService } from './booking-policy.service';
import { PriceEngineService } from './price-engine.service';
import { PublicBookingsService } from './public-bookings.service';

const valid = {
  roomSlug: 'double-lake-window',
  checkIn: '2099-09-10',
  checkOut: '2099-09-12',
  fullName: 'Nguyen Van A',
  phone: '0901234567',
  adults: 2,
  children: 0,
  extraMattressQuantity: 0,
  bookingPolicyAccepted: true,
  privacyPolicyAccepted: true,
};

function normalizedRequest(overrides: Partial<typeof valid> = {}) {
  const dto = { ...valid, ...overrides };
  return {
    roomSlug: dto.roomSlug,
    checkIn: dto.checkIn,
    checkOut: dto.checkOut,
    fullName: dto.fullName,
    phone: dto.phone,
    email: null,
    adults: dto.adults,
    children: dto.children,
    extraMattressQuantity: dto.extraMattressQuantity,
    specialRequest: null,
    expectedArrivalTime: null,
    bookingPolicyAccepted: dto.bookingPolicyAccepted,
    privacyPolicyAccepted: dto.privacyPolicyAccepted,
  };
}

function checkout(overrides: { rateType?: 'STANDARD' | 'HOLIDAY'; roomType?: Record<string, unknown>; previous?: Record<string, unknown> | null } = {}) {
  const roomType = {
    id: 'room-type-1',
    standardAdults: 2,
    maxAdults: 3,
    maxChildren: 1,
    maxTotalGuests: 3,
    ...overrides.roomType,
  };
  const rule = {
    id: 'rate-1',
    dateFrom: new Date('2099-01-01T00:00:00.000Z'),
    dateTo: new Date('2100-01-01T00:00:00.000Z'),
    daysOfWeek: [],
    nightlyPrice: 550_000n,
    extraAdultPrice: 200_000n,
    extraChildPrice: 0n,
    minNights: 1,
    maxNights: null,
    priority: 10,
    status: 'ACTIVE',
    rateType: overrides.rateType ?? 'STANDARD',
  };
  const customer = {
    id: 'customer-1',
    firstBookingAt: null,
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
  };
  const booking = {
    id: 'booking-1',
    bookingCode: 'VMD-BK-ABC1234567',
    currency: 'VND',
    createdAt: new Date('2099-09-01T00:00:00.000Z'),
  };
  const tx = {
    idempotencyKey: {
      findUnique: jest.fn().mockResolvedValue(overrides.previous ?? null),
      create: jest.fn(),
    },
    roomType: { findFirst: jest.fn().mockResolvedValue(roomType) },
    room: { findFirst: jest.fn().mockResolvedValue({ id: 'room-201' }) },
    roomRateRule: { findMany: jest.fn().mockResolvedValue([rule]) },
    customer: {
      findFirst: jest.fn().mockResolvedValue(customer),
      create: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ ...booking, ...data })),
    },
    bookingRoom: { create: jest.fn() },
    roomOccupancy: { createMany: jest.fn() },
    resourceHold: {
      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'hold-1', ...data })),
    },
    bookingStatusHistory: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn(async (operation: (value: typeof tx) => unknown) => operation(tx)) };
  const payments = {
    createIntentForRoomCheckout: jest.fn().mockResolvedValue({ paymentIntentId: 'payment-1' }),
  };
  const policy = new BookingPolicyService(() => new Date('2099-09-01T00:00:00.000Z'), 30);
  const service = new PublicBookingsService(prisma as never, new PriceEngineService(), payments as never, policy);
  return { service, tx, payments };
}

describe('PublicBookingsService', () => {
  it('rejects a phone outside the Vietnamese E.164 mobile policy before a database operation', async () => {
    const service = new PublicBookingsService({ $transaction: jest.fn() } as never, {} as never, {} as never, {} as never);
    await expect(service.create({ ...valid, phone: '+12025550123' }, 'checkout-key', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a direct production booking with a 30-minute hold and 50% deposit', async () => {
    const { service, tx, payments } = checkout();

    const response = await service.create(valid, 'checkout-key', {
      correlationId: 'correlation-1',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(response).toEqual(expect.objectContaining({
      bookingCode: expect.stringMatching(/^VMD-BK-[A-F0-9]{10}$/),
      status: 'PENDING_PAYMENT',
      paymentReference: 'payment-1',
      totalAmount: '1100000',
      depositRequiredAmount: '550000',
      depositPolicy: 'STANDARD_50',
      currency: 'VND',
    }));
    expect(tx.booking.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      source: 'DIRECT',
      status: 'PENDING_PAYMENT',
      totalAmount: 1_100_000n,
      depositRequiredAmount: 550_000n,
      depositPolicy: 'STANDARD_50',
    }) });
    expect(tx.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: expect.objectContaining({
        firstBookingAt: expect.any(Date),
        lastBookingAt: expect.any(Date),
        privacyConsentAt: expect.any(Date),
      }),
    });
    expect(tx.resourceHold.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      status: 'ACTIVE',
      idempotencyKey: 'booking:checkout-key',
      expiresAt: expect.any(Date),
    }) });
    const holdInput = tx.resourceHold.create.mock.calls[0]?.[0] as { data: { expiresAt: Date } };
    expect(holdInput.data.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 60_000);
    expect(holdInput.data.expiresAt.getTime()).toBeLessThan(Date.now() + 31 * 60_000);
    expect(tx.roomOccupancy.createMany).toHaveBeenCalledWith({ data: [
      expect.objectContaining({ roomId: 'room-201', status: 'HOLD', stayDate: new Date('2099-09-10T00:00:00.000Z') }),
      expect.objectContaining({ roomId: 'room-201', status: 'HOLD', stayDate: new Date('2099-09-11T00:00:00.000Z') }),
    ] });
    expect(payments.createIntentForRoomCheckout).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ id: 'booking-1', depositRequiredAmount: 550_000n }),
      expect.objectContaining({ id: 'hold-1' }),
      expect.objectContaining({ correlationId: 'correlation-1' }),
    );
    expect(tx.bookingStatusHistory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ reason: 'public production checkout' }) });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'booking.created' }) });
    expect(tx.outboxEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: 'booking.created' }) });
    expect(tx.idempotencyKey.create).toHaveBeenCalledWith({ data: expect.objectContaining({ scope: 'public.room.checkout', responseStatus: 201 }) });
  });

  it('requires and charges one extra mattress when guest count exceeds standard capacity', async () => {
    const missing = checkout();
    await expect(missing.service.create({ ...valid, adults: 3 }, 'missing-mattress', {})).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EXTRA_MATTRESS_REQUIRED' }),
    });
    expect(missing.tx.room.findFirst).not.toHaveBeenCalled();

    const added = checkout();
    const response = await added.service.create({ ...valid, adults: 3, extraMattressQuantity: 1 }, 'with-mattress', {});
    expect(response).toEqual(expect.objectContaining({ totalAmount: '1500000', depositRequiredAmount: '750000' }));
    expect(added.tx.bookingRoom.create).toHaveBeenCalledWith({ data: expect.objectContaining({ extraMattressQuantity: 1, amount: 1_500_000n }) });
  });

  it('requires 100% deposit whenever any applied nightly rule is a holiday rate', async () => {
    const { service, tx } = checkout({ rateType: 'HOLIDAY' });
    const response = await service.create(valid, 'holiday-checkout', {});
    expect(response).toEqual(expect.objectContaining({ totalAmount: '1100000', depositRequiredAmount: '1100000', depositPolicy: 'HOLIDAY_100' }));
    expect(tx.booking.create).toHaveBeenCalledWith({ data: expect.objectContaining({ depositRequiredAmount: 1_100_000n, depositPolicy: 'HOLIDAY_100' }) });
  });

  it('replays only the safe stored response for an identical idempotent checkout', async () => {
    const safeResponse = { bookingCode: 'VMD-BK-12345678', status: 'PENDING_PAYMENT', paymentReference: 'opaque-payment-id' };
    const requestHash = createHash('sha256').update(JSON.stringify(normalizedRequest())).digest('hex');
    const { service, tx } = checkout({ previous: { scope: 'public.room.checkout', requestHash, responseBody: safeResponse } });

    await expect(service.create(valid, 'checkout-key', {})).resolves.toEqual(safeResponse);
    expect(tx.idempotencyKey.findUnique).toHaveBeenCalledWith({ where: { key: 'checkout-key' } });
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key with a different request payload', async () => {
    const otherHash = createHash('sha256').update(JSON.stringify(normalizedRequest({ adults: 3 }))).digest('hex');
    const { service, tx } = checkout({ previous: { scope: 'public.room.checkout', requestHash: otherHash, responseBody: { bookingCode: 'old' } } });

    await expect(service.create(valid, 'checkout-key', {})).rejects.toBeInstanceOf(ConflictException);
    expect(tx.booking.create).not.toHaveBeenCalled();
  });
});
