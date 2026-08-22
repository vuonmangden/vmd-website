import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicApi } from './room-api';

describe('publicApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the API under the /api/v1 prefix the server actually serves', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { items: [] }, meta: {}, correlationId: 'x' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await publicApi('/public/rooms');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/public/rooms');
  });

  it('unwraps the { data, meta, correlationId } envelope the API always returns', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { items: [{ slug: 'phong-1' }] }, meta: {}, correlationId: 'x' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await publicApi<{ items: Array<{ slug: string }> }>('/public/rooms');

    expect(result).toEqual({ items: [{ slug: 'phong-1' }] });
  });
});
