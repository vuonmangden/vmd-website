import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingLookupService } from './booking-lookup.service';
import { CancellationPolicyService } from './cancellation-policy.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const booking = {
  id: '00000000-0000-4000-8000-000000000001', bookingCode: 'SYN-TEST', status: 'PENDING_PAYMENT', checkInDate: new Date('2099-01-10T00:00:00Z'), checkOutDate: new Date('2099-01-12T00:00:00Z'), adults: 2, children: 1, totalAmount: 2000000n, specialRequest: 'Quiet room', createdAt: new Date('2098-12-01T00:00:00Z'),
  customer: { phoneNormalized: '+84912345678', emailNormalized: 'guest@example.test' }, rooms: [{ roomType: { name: 'Pine Cabin' } }, { roomType: { name: 'Pine Cabin' } }], paymentIntents: [{ id: '00000000-0000-4000-8000-000000000002', status: 'PENDING', amount: 2000000n, paidAmount: 0n, expiresAt: new Date('2099-01-01T00:00:00Z') }],
};

describe('BookingLookupService', () => {
  it('returns a safe masked projection only after code and Vietnamese phone match', async () => {
    const prisma = { booking: { findFirst: jest.fn().mockResolvedValue(booking) } };
    const rate = { assertAllowed: jest.fn(), reset: jest.fn(), recordFailure: jest.fn() };
    const service = new BookingLookupService(prisma as never, rate as never, {} as never, {} as never, {} as never);
    const result = await service.lookup('syn-test', '0912345678', '198.51.100.10');
    expect(result).toEqual(expect.objectContaining({ bookingCode: 'SYN-TEST', phone: '****5678', email: 'gue***@example.test', roomTypes: [{ name: 'Pine Cabin', quantity: 2 }] }));
    expect(JSON.stringify(result)).not.toContain('paymentIntents');
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ bookingCode: 'SYN-TEST', customer: expect.objectContaining({ phoneNormalized: '+84912345678' }) }) }));
  });

  it('returns the same not-found result and records an IP failure for a wrong phone or code', async () => {
    const prisma = { booking: { findFirst: jest.fn().mockResolvedValue(null) } };
    const rate = { assertAllowed: jest.fn(), reset: jest.fn(), recordFailure: jest.fn() };
    const service = new BookingLookupService(prisma as never, rate as never, {} as never, {} as never, {} as never);
    await expect(service.lookup('SYN-UNKNOWN', '0912345678', '198.51.100.10')).rejects.toBeInstanceOf(NotFoundException);
    expect(rate.recordFailure).toHaveBeenCalledWith('198.51.100.10');
  });
});

describe('BookingLookupService.decide', () => {
  const REQUEST_ID = '00000000-0000-4000-8000-000000000010';
  const BOOKING_ID = '00000000-0000-4000-8000-000000000011';
  const MANAGER: AuthenticatedActor = { staffProfileId: '00000000-0000-4000-8000-000000000001', authUserId: '00000000-0000-4000-8000-000000000002', fullName: 'Manager', email: 'manager@example.com', roles: ['MANAGER'], permissions: ['booking.cancel'] };
  const RECEPTION: AuthenticatedActor = { ...MANAGER, roles: ['RECEPTION'] };

  const REQUEST_CREATED_AT = new Date('2026-08-20T02:00:00.000Z');
  const CHECK_IN_DATE = new Date('2026-09-11T00:00:00.000Z');
  // The SLA deadline is the booking's own check-in date (§8 line 419), not the day the request was filed.
  const WELL_BEFORE_CHECK_IN = new Date('2026-08-25T10:00:00.000Z'); // ~17 days ahead — SLA met, and clears the 7-day/100% STANDARD threshold
  const AFTER_CHECK_IN = new Date('2026-09-12T10:00:00.000Z'); // decided a day after the stay date — SLA missed

  function cancellationRequest(overrides?: Record<string, unknown>) {
    return { id: REQUEST_ID, bookingId: BOOKING_ID, requestType: 'CANCELLATION', status: 'PENDING_REVIEW', createdAt: REQUEST_CREATED_AT, ...overrides };
  }

  function fixture(now: Date = WELL_BEFORE_CHECK_IN) {
    const bookingGuestRequest = { findUnique: jest.fn().mockResolvedValue(cancellationRequest()), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn().mockImplementation(({ data }) => ({ id: REQUEST_ID, status: data.status })) };
    const bookingModel = { findUnique: jest.fn().mockResolvedValue({ checkInDate: CHECK_IN_DATE, dateChangeCount: 0, paymentIntents: [{ paidAmount: 2000000n }] }) };
    const tx = { bookingGuestRequest, booking: bookingModel, auditLog: { create: jest.fn() }, outboxEvent: { create: jest.fn() } };
    const prisma = { $transaction: jest.fn((op: (t: typeof tx) => unknown) => op(tx)) };
    const bookingState = { transitionInTransaction: jest.fn().mockResolvedValue({ id: BOOKING_ID, status: 'CANCELLED' }) };
    const dateChanges = { executeInTransaction: jest.fn().mockResolvedValue({ previousTotalAmount: 2000000n, recalculatedTotalAmount: 2200000n, chargedTotalAmount: 2200000n, additionalAmountDue: 200000n, previousCheckIn: '2026-09-11', previousCheckOut: '2026-09-12', newCheckIn: '2026-09-20', newCheckOut: '2026-09-21' }) };
    const service = new BookingLookupService(prisma as never, {} as never, bookingState as never, new CancellationPolicyService(), dateChanges as never, () => now);
    return { tx, service, bookingState, dateChanges };
  }

  it('requires Manager or Super Admin approval', async () => {
    const { service } = fixture();
    await expect(service.decide(REQUEST_ID, 'APPROVED', undefined, 'STANDARD', RECEPTION)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires a cancellation policy to approve a cancellation', async () => {
    const { service } = fixture();
    await expect(service.decide(REQUEST_ID, 'APPROVED', undefined, undefined, MANAGER)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'BOOKING_POLICY_REQUIRED' }) });
  });

  it('approves a cancellation, computes the refund from the paid amount, cancels the booking, and reports the SLA', async () => {
    const { tx, service, bookingState } = fixture(WELL_BEFORE_CHECK_IN);

    const result = await service.decide(REQUEST_ID, 'APPROVED', 'guest called in', 'STANDARD', MANAGER, 'corr-1');

    expect(bookingState.transitionInTransaction).toHaveBeenCalledWith(tx, BOOKING_ID, 'CANCELLED', `guest cancellation request ${REQUEST_ID}`);
    expect(result.refund).toEqual({ policy: 'STANDARD', tierCode: 'STANDARD_7_DAYS_PLUS', refundPercent: 100, refundAmount: '2000000', forfeitedAmount: '0' });
    expect(result.slaMet).toBe(true);
    expect(tx.bookingGuestRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }));
    expect(tx.bookingGuestRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ refundPolicy: 'STANDARD', refundAmount: 2000000n, forfeitedAmount: 0n }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ correlationId: 'corr-1' }) }));
  });

  it('flags the SLA as missed when decided after the check-in date', async () => {
    const { service } = fixture(AFTER_CHECK_IN);
    const result = await service.decide(REQUEST_ID, 'APPROVED', undefined, 'STANDARD', MANAGER);
    expect(result.slaMet).toBe(false);
  });

  it('rejects a request without computing a refund or touching the booking', async () => {
    const { tx, service, bookingState } = fixture();

    const result = await service.decide(REQUEST_ID, 'REJECTED', 'not eligible', undefined, MANAGER);

    expect(result.refund).toBeNull();
    expect(bookingState.transitionInTransaction).not.toHaveBeenCalled();
    expect(tx.bookingGuestRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ refundAmount: expect.anything() }) }));
  });

  it('executes a DATE_CHANGE approval with an explicit policy', async () => {
    const { tx, service, bookingState, dateChanges } = fixture();
    tx.bookingGuestRequest.findUnique.mockResolvedValue(cancellationRequest({ requestType: 'DATE_CHANGE', requestedData: { checkIn: '2026-09-20', checkOut: '2026-09-21' } }));

    const result = await service.decide(REQUEST_ID, 'APPROVED', undefined, 'STANDARD', MANAGER);

    expect(result.refund).toBeNull();
    expect(bookingState.transitionInTransaction).not.toHaveBeenCalled();
    expect(dateChanges.executeInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({ id: REQUEST_ID }), 'STANDARD', MANAGER.staffProfileId, undefined, WELL_BEFORE_CHECK_IN);
    expect(result.dateChange).toEqual(expect.objectContaining({ additionalAmountDue: '200000', newCheckIn: '2026-09-20' }));
  });

  it('throws NotFoundException for a request that is not pending', async () => {
    const { tx, service } = fixture();
    tx.bookingGuestRequest.findUnique.mockResolvedValue(cancellationRequest({ status: 'APPROVED' }));
    await expect(service.decide(REQUEST_ID, 'APPROVED', undefined, 'STANDARD', MANAGER)).rejects.toBeInstanceOf(NotFoundException);
  });
});
