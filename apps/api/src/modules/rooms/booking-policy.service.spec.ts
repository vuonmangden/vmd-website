import { BookingPolicyService, readHoldMinutes } from './booking-policy.service';

describe('BookingPolicyService', () => {
  const now = new Date('2026-09-01T03:00:00.000Z'); // 10:00 Asia/Ho_Chi_Minh

  it('uses the approved 30-minute hold by default and rejects unsafe configuration', () => {
    expect(readHoldMinutes({})).toBe(30);
    expect(readHoldMinutes({ BOOKING_HOLD_MINUTES: '45' })).toBe(45);
    expect(() => readHoldMinutes({ BOOKING_HOLD_MINUTES: '0' })).toThrow('Booking policy');
    expect(() => readHoldMinutes({ BOOKING_HOLD_MINUTES: '361' })).toThrow('Booking policy');
  });

  it('calculates a 50% standard deposit rounded down to one thousand VND', () => {
    const service = new BookingPolicyService(() => now, 30);
    expect(service.deposit(551_999n, new Date('2026-09-10T00:00:00.000Z'), false)).toEqual({ amount: 275_000n, percent: 50, policy: 'STANDARD_50' });
  });

  it('requires full payment within three operational days or for a holiday rate', () => {
    const service = new BookingPolicyService(() => now, 30);
    expect(service.deposit(550_000n, new Date('2026-09-04T00:00:00.000Z'), false).policy).toBe('LAST_MINUTE_100');
    expect(service.deposit(780_000n, new Date('2026-09-20T00:00:00.000Z'), true)).toEqual({ amount: 780_000n, percent: 100, policy: 'HOLIDAY_100' });
  });

  it('never lets the payment expiry extend beyond the hold', () => {
    const service = new BookingPolicyService(() => now, 30);
    expect(service.holdExpiresAt()).toEqual(new Date('2026-09-01T03:30:00.000Z'));
  });
});
