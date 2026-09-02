import { afterEach, describe, expect, it, vi } from 'vitest';
import { cancelBooking, confirmBooking, getBooking, listBookings } from './bookings-api';
import * as authClient from '../lib/auth-client';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

describe('bookings-api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds the query string for listBookings with only the filters given', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { items: [], page: 1, pageSize: 50, total: 0 } }));
    vi.stubGlobal('fetch', fetchMock);

    await listBookings({ status: 'CONFIRMED', page: 2 });

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('/admin/bookings?');
    expect(url).toContain('status=CONFIRMED');
    expect(url).toContain('page=2');
    expect(url).toContain('pageSize=50');
  });

  it('fetches one booking by id', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'b1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await getBooking('b1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/bookings/b1');
  });

  it('posts to /confirm with an optional reason', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'b1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await confirmBooking('b1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/bookings/b1/confirm');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
  });

  it('posts to /cancel with the required reason', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'b1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await cancelBooking('b1', 'Khách yêu cầu hủy');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/bookings/b1/cancel');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ reason: 'Khách yêu cầu hủy' });
  });
});
