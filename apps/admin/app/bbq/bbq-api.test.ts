import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBbqReservation, listBbqReservations, transitionBbqReservation } from './bbq-api';
import * as authClient from '../lib/auth-client';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

describe('bbq-api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds the query string for listBbqReservations', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { items: [], page: 1, pageSize: 50, total: 0 } }));
    vi.stubGlobal('fetch', fetchMock);

    await listBbqReservations({ status: 'CONFIRMED', page: 2 });

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('/admin/bbq/reservations?');
    expect(url).toContain('status=CONFIRMED');
    expect(url).toContain('page=2');
  });

  it('fetches one reservation by id', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'r1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await getBbqReservation('r1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/bbq/reservations/r1');
  });

  it.each(['confirm', 'cancel', 'check-in', 'check-out'] as const)('posts to /%s', async (action) => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'r1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await transitionBbqReservation('r1', action, 'Lý do');

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`http://localhost:3002/api/v1/admin/bbq/reservations/r1/${action}`);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ reason: 'Lý do' });
  });
});
