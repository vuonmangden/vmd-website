import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoomBooking } from './booking-api';

const PAYLOAD = {
  roomSlug: 'phong-1',
  checkIn: '2026-09-01',
  checkOut: '2026-09-03',
  fullName: 'Nguyễn Văn A',
  phone: '0987654321',
  adults: 2,
  children: 0,
  extraMattressQuantity: 0,
  bookingPolicyAccepted: true,
  privacyPolicyAccepted: true,
};

describe('createRoomBooking', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the API under the /api/v1 prefix and unwraps the response envelope', async () => {
    const body = { bookingCode: 'VMD-BK-1', status: 'PENDING_PAYMENT', paymentReference: 'ref-1', totalAmount: '550000', depositRequiredAmount: '275000', depositPolicy: 'STANDARD_50', holdExpiresAt: '2026-09-01T03:30:00.000Z', currency: 'VND' };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: body, meta: {}, correlationId: 'x' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createRoomBooking(PAYLOAD, 'idem-1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/public/room-bookings');
    expect(result).toEqual(body);
  });
});
