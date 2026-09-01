import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicApi } from './bbq-api';

describe('publicApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the API under the /api/v1 prefix the server actually serves', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { areas: [] }, meta: {}, correlationId: 'x' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await publicApi('/public/bbq/availability');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/public/bbq/availability');
  });

  it('unwraps the { data, meta, correlationId } envelope the API always returns', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { areas: [{ code: 'khu-a' }] }, meta: {}, correlationId: 'x' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await publicApi<{ areas: Array<{ code: string }> }>('/public/bbq/availability');

    expect(result).toEqual({ areas: [{ code: 'khu-a' }] });
  });
});
