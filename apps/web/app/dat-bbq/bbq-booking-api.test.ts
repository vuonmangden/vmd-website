import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBbqReservation } from './bbq-booking-api';

const PAYLOAD = {
  tableId: 'table-1',
  date: '2026-09-01',
  startTime: '18:00',
  endTime: '20:00',
  fullName: 'Nguyễn Văn A',
  phone: '0987654321',
  adults: 4,
  children: 0,
};

describe('createBbqReservation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the API under the /api/v1 prefix and unwraps the response envelope', async () => {
    const body = { reservationCode: 'BBQ-1', status: 'PENDING_PAYMENT', paymentReference: 'ref-1' };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: body, meta: {}, correlationId: 'x' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createBbqReservation(PAYLOAD, 'idem-1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/public/bbq-reservations');
    expect(result).toEqual(body);
  });
});
