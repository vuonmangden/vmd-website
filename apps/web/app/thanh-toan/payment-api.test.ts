import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatVnd, getPublicPaymentStatus, nextPaymentPollDelay, validPaymentReference } from './payment-api';

const REFERENCE = '00000000-0000-4000-8000-000000000001';

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

describe('getPublicPaymentStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the API under the /api/v1 prefix and unwraps the response envelope', async () => {
    const body = {
      paymentIntentId: 'intent-1',
      status: 'PENDING',
      amount: '100000',
      currency: 'VND',
      expiresAt: '2026-08-22T00:00:00.000Z',
      transferContent: 'VMD123',
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: body, meta: {}, correlationId: 'x' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getPublicPaymentStatus(REFERENCE);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`http://localhost:3002/api/v1/public/payment-status/${REFERENCE}`);
    expect(result).toEqual(body);
  });
});
