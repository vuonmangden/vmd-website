import { describe, expect, it } from 'vitest';
import { formatVnd, nextPaymentPollDelay, validPaymentReference } from './payment-api';

describe('public payment status helpers', () => {
  it('accepts only an opaque UUID v4 reference', () => {
    expect(validPaymentReference('00000000-0000-4000-8000-000000000001')).toBe(true);
    expect(validPaymentReference('booking-code-or-database-id')).toBe(false);
    expect(validPaymentReference(null)).toBe(false);
  });

  it('uses adaptive polling and stops for every terminal state', () => {
    expect(nextPaymentPollDelay('PENDING', 1)).toBe(10_000);
    expect(nextPaymentPollDelay('PENDING', 5 * 60_000)).toBe(30_000);
    expect(nextPaymentPollDelay('PAID', 1)).toBeNull();
    expect(nextPaymentPollDelay('EXPIRED', 1)).toBeNull();
    expect(nextPaymentPollDelay('RECONCILIATION_REQUIRED', 1)).toBeNull();
  });

  it('formats only safe VND integer values', () => {
    expect(formatVnd('2500000')).toBe('2.500.000 VND');
    expect(formatVnd('not-money')).toBe('Không thể hiển thị số tiền');
  });
});
