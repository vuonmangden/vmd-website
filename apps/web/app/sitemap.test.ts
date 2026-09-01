import { afterEach, describe, expect, it, vi } from 'vitest';
import sitemap from './sitemap';

describe('sitemap', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists the static routes plus one entry per room slug and published article slug', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/public/rooms')) {
        return Promise.resolve(new Response(JSON.stringify({ data: { items: [{ slug: 'phong-vuon' }, { slug: 'phong-suoi' }] }, meta: {}, correlationId: 'x' }), { status: 200 }));
      }
      if (url.includes('/public/articles')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ slug: 'khai-truong' }], meta: {}, correlationId: 'x' }), { status: 200 }));
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sitemap();

    expect(result.map((entry) => entry.url)).toEqual([
      'http://localhost:3000',
      'http://localhost:3000/phong',
      'http://localhost:3000/bbq',
      'http://localhost:3000/tin-tuc',
      'http://localhost:3000/phong/phong-vuon',
      'http://localhost:3000/phong/phong-suoi',
      'http://localhost:3000/tin-tuc/khai-truong',
    ]);
  });

  it('still returns the static routes if the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await sitemap();

    expect(result.map((entry) => entry.url)).toEqual([
      'http://localhost:3000',
      'http://localhost:3000/phong',
      'http://localhost:3000/bbq',
      'http://localhost:3000/tin-tuc',
    ]);
  });
});
