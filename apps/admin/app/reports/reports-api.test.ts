import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  exportReport,
  getBbqReport,
  getBookingsReport,
  getOccupancyReport,
  getPaymentsReport,
  getRevenueReport,
} from './reports-api';
import * as authClient from '../lib/auth-client';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

describe('reports-api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches the bookings report with the from/to range', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { from: '2026-08-01', to: '2026-08-31' } }));
    vi.stubGlobal('fetch', fetchMock);

    await getBookingsReport('2026-08-01', '2026-08-31');

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('/admin/reports/bookings?');
    expect(url).toContain('from=2026-08-01');
    expect(url).toContain('to=2026-08-31');
  });

  it('fetches the revenue report', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await getRevenueReport('2026-08-01', '2026-08-31');

    expect((fetchMock.mock.calls[0]?.[0] as string)).toContain('/admin/reports/revenue?');
  });

  it('fetches the occupancy report', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await getOccupancyReport('2026-08-01', '2026-08-31');

    expect((fetchMock.mock.calls[0]?.[0] as string)).toContain('/admin/reports/occupancy?');
  });

  it('fetches the bbq report', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await getBbqReport('2026-08-01', '2026-08-31');

    expect((fetchMock.mock.calls[0]?.[0] as string)).toContain('/admin/reports/bbq?');
  });

  it('fetches the payments report', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await getPaymentsReport('2026-08-01', '2026-08-31');

    expect((fetchMock.mock.calls[0]?.[0] as string)).toContain('/admin/reports/payments?');
  });

  it('requests a CSV export with the type and range', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { filename: 'report-revenue-2026-08-01-2026-08-31.csv', contentType: 'text/csv', rowCount: 1, body: 'a,b\n1,2\n' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await exportReport('revenue', '2026-08-01', '2026-08-31');

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('/admin/reports/export?');
    expect(url).toContain('type=revenue');
    expect(url).toContain('from=2026-08-01');
    expect(url).toContain('to=2026-08-31');
    expect(result.filename).toBe('report-revenue-2026-08-01-2026-08-31.csv');
  });
});
