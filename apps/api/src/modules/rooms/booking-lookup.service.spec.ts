import { NotFoundException } from '@nestjs/common';
import { BookingLookupService } from './booking-lookup.service';

const booking = {
  id: '00000000-0000-4000-8000-000000000001', bookingCode: 'SYN-TEST', status: 'PENDING_PAYMENT', checkInDate: new Date('2099-01-10T00:00:00Z'), checkOutDate: new Date('2099-01-12T00:00:00Z'), adults: 2, children: 1, totalAmount: 2000000n, specialRequest: 'Quiet room', createdAt: new Date('2098-12-01T00:00:00Z'),
  customer: { phoneNormalized: '+84912345678', emailNormalized: 'guest@example.test' }, rooms: [{ roomType: { name: 'Pine Cabin' } }, { roomType: { name: 'Pine Cabin' } }], paymentIntents: [{ id: '00000000-0000-4000-8000-000000000002', status: 'PENDING', amount: 2000000n, paidAmount: 0n, expiresAt: new Date('2099-01-01T00:00:00Z') }],
};

describe('BookingLookupService', () => {
  it('returns a safe masked projection only after code and Vietnamese phone match', async () => {
    const prisma = { booking: { findFirst: jest.fn().mockResolvedValue(booking) } };
    const rate = { assertAllowed: jest.fn(), reset: jest.fn(), recordFailure: jest.fn() };
    const service = new BookingLookupService(prisma as never, rate as never, {} as never);
    const result = await service.lookup('syn-test', '0912345678', '198.51.100.10');
    expect(result).toEqual(expect.objectContaining({ bookingCode: 'SYN-TEST', phone: '****5678', email: 'gue***@example.test', roomTypes: [{ name: 'Pine Cabin', quantity: 2 }] }));
    expect(JSON.stringify(result)).not.toContain('paymentIntents');
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ bookingCode: 'SYN-TEST', customer: expect.objectContaining({ phoneNormalized: '+84912345678' }) }) }));
  });

  it('returns the same not-found result and records an IP failure for a wrong phone or code', async () => {
    const prisma = { booking: { findFirst: jest.fn().mockResolvedValue(null) } };
    const rate = { assertAllowed: jest.fn(), reset: jest.fn(), recordFailure: jest.fn() };
    const service = new BookingLookupService(prisma as never, rate as never, {} as never);
    await expect(service.lookup('SYN-UNKNOWN', '0912345678', '198.51.100.10')).rejects.toBeInstanceOf(NotFoundException);
    expect(rate.recordFailure).toHaveBeenCalledWith('198.51.100.10');
  });
});
