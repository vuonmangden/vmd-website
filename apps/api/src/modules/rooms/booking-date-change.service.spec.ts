import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingDateChangeService } from './booking-date-change.service';
import { CancellationPolicyService } from './cancellation-policy.service';

const BOOKING_ID = '00000000-0000-4000-8000-000000000001';
const REQUEST_ID = '00000000-0000-4000-8000-000000000002';
const ROOM_ID = '00000000-0000-4000-8000-000000000003';
const NEW_ROOM_ID = '00000000-0000-4000-8000-000000000004';
const ROOM_TYPE_ID = '00000000-0000-4000-8000-000000000005';
const ACTOR_ID = '00000000-0000-4000-8000-000000000006';
const NOW = new Date('2026-09-01T03:00:00.000Z');

function fixture(overrides: Record<string, unknown> = {}) {
  const booking = {
    id: BOOKING_ID, status: 'CONFIRMED', checkInDate: new Date('2026-09-20T00:00:00.000Z'), checkOutDate: new Date('2026-09-22T00:00:00.000Z'),
    originalCheckInDate: null, originalCheckOutDate: null, adults: 2, children: 0, totalAmount: 1_100_000n,
    depositRequiredAmount: 550_000n, dateChangeCount: 0,
    rooms: [{ id: 'booking-room-1', roomId: ROOM_ID, roomTypeId: ROOM_TYPE_ID, extraMattressQuantity: 0 }],
    ...overrides,
  };
  const tx = {
    booking: { findUnique: jest.fn().mockResolvedValue(booking), update: jest.fn() },
    roomType: { findFirst: jest.fn().mockResolvedValue({ id: ROOM_TYPE_ID, standardAdults: 2, maxAdults: 3, maxChildren: 1, maxTotalGuests: 3 }) },
    room: { findFirst: jest.fn().mockResolvedValue({ id: NEW_ROOM_ID }) },
    roomRateRule: { findMany: jest.fn().mockResolvedValue([]) },
    roomOccupancy: { deleteMany: jest.fn(), createMany: jest.fn() },
    bookingRoom: { update: jest.fn() }, resourceHold: { updateMany: jest.fn() },
    notificationJob: { updateMany: jest.fn() }, auditLog: { create: jest.fn() }, outboxEvent: { create: jest.fn() },
  };
  const quote = {
    nightlySubtotal: 1_300_000n, extraGuestSubtotal: 0n, total: 1_300_000n, nights: 2,
    appliedRuleIds: ['rate-1', 'rate-2'], usesHolidayRate: false,
    nightlyBreakdown: [
      { date: '2026-10-01', ruleId: 'rate-1', rateType: 'STANDARD', baseAmount: 650_000n, extraMattressAmount: 0n, extraChildAmount: 0n, total: 650_000n },
      { date: '2026-10-02', ruleId: 'rate-2', rateType: 'STANDARD', baseAmount: 650_000n, extraMattressAmount: 0n, extraChildAmount: 0n, total: 650_000n },
    ],
  };
  const pricing = { quote: jest.fn().mockReturnValue(quote) };
  const bookingState = { transitionInTransaction: jest.fn() };
  const service = new BookingDateChangeService(pricing as never, bookingState as never, new CancellationPolicyService());
  const request = { id: REQUEST_ID, bookingId: BOOKING_ID, requestedData: { checkIn: '2026-10-01', checkOut: '2026-10-03' } };
  return { booking, tx, quote, pricing, bookingState, service, request };
}

describe('BookingDateChangeService', () => {
  it('reallocates occupancy, snapshots the higher price and records one date change atomically', async () => {
    const { tx, service, request, bookingState } = fixture();
    const result = await service.executeInTransaction(tx as never, request, 'STANDARD', ACTOR_ID, 'corr-1', NOW);

    expect(result).toEqual({
      previousTotalAmount: 1_100_000n, recalculatedTotalAmount: 1_300_000n, chargedTotalAmount: 1_300_000n, additionalAmountDue: 200_000n,
      previousCheckIn: '2026-09-20', previousCheckOut: '2026-09-22', newCheckIn: '2026-10-01', newCheckOut: '2026-10-03',
    });
    expect(bookingState.transitionInTransaction).toHaveBeenNthCalledWith(1, tx, BOOKING_ID, 'MODIFIED', `date change request ${REQUEST_ID}`);
    expect(bookingState.transitionInTransaction).toHaveBeenNthCalledWith(2, tx, BOOKING_ID, 'CONFIRMED', `date change request ${REQUEST_ID} applied`);
    expect(tx.roomOccupancy.deleteMany).toHaveBeenCalledWith({ where: { bookingId: BOOKING_ID } });
    expect(tx.roomOccupancy.createMany).toHaveBeenCalledWith({ data: [
      expect.objectContaining({ roomId: NEW_ROOM_ID, stayDate: new Date('2026-10-01T00:00:00.000Z'), status: 'CONFIRMED' }),
      expect.objectContaining({ roomId: NEW_ROOM_ID, stayDate: new Date('2026-10-02T00:00:00.000Z'), status: 'CONFIRMED' }),
    ] });
    expect(tx.booking.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ dateChangeCount: 1, totalAmount: 1_300_000n, depositRequiredAmount: 750_000n }) }));
    expect(tx.notificationJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'booking.rescheduled', correlationId: 'corr-1' }) }));
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'booking.modified' }) }));
  });

  it('keeps the previous charged total when the recalculated stay is cheaper', async () => {
    const { tx, service, request, quote } = fixture();
    quote.total = 900_000n;
    const result = await service.executeInTransaction(tx as never, request, 'STANDARD', ACTOR_ID, undefined, NOW);
    expect(result.recalculatedTotalAmount).toBe(900_000n);
    expect(result.chargedTotalAmount).toBe(1_100_000n);
    expect(result.additionalAmountDue).toBe(0n);
  });

  it('sends a second automatic date change to manual contact', async () => {
    const { tx, service, request } = fixture({ dateChangeCount: 1 });
    await expect(service.executeInTransaction(tx as never, request, 'STANDARD', ACTOR_ID, undefined, NOW)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.executeInTransaction(tx as never, request, 'STANDARD', ACTOR_ID, undefined, NOW)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'DATE_CHANGE_MANUAL_CONTACT_REQUIRED' }) });
    expect(tx.roomOccupancy.deleteMany).not.toHaveBeenCalled();
  });

  it('rolls back before mutation when no same-type room is available', async () => {
    const { tx, service, request } = fixture();
    tx.room.findFirst.mockResolvedValue(null);
    await expect(service.executeInTransaction(tx as never, request, 'STANDARD', ACTOR_ID, undefined, NOW)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.roomOccupancy.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects a new check-in beyond 60 days from the original stay', async () => {
    const { tx, service, request } = fixture();
    request.requestedData = { checkIn: '2026-11-25', checkOut: '2026-11-27' };
    await expect(service.executeInTransaction(tx as never, request, 'STANDARD', ACTOR_ID, undefined, NOW)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'DATE_CHANGE_BEYOND_60_DAYS' }) });
    expect(tx.room.findFirst).not.toHaveBeenCalled();
  });

  it('does not consume the one allowed change when the requested dates are unchanged', async () => {
    const { tx, service, request } = fixture();
    request.requestedData = { checkIn: '2026-09-20', checkOut: '2026-09-22' };
    await expect(service.executeInTransaction(tx as never, request, 'STANDARD', ACTOR_ID, undefined, NOW)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'DATE_CHANGE_UNCHANGED' }),
    });
    expect(tx.room.findFirst).not.toHaveBeenCalled();
    expect(tx.booking.update).not.toHaveBeenCalled();
  });
});
