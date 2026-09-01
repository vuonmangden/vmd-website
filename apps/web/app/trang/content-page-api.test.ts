import { afterEach, describe, expect, it, vi } from 'vitest';
import { getContentPageBySlug, paragraphsFromText, truncateForDescription } from './content-page-api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('getContentPageBySlug', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('calls the API under /api/v1/public/content-pages and unwraps the envelope', async () => {
    const page = { slug: 'chinh-sach-huy', title: 'Chính sách hủy', body: 'Nội dung.', publishedAt: '2026-08-01T00:00:00.000Z' };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: page, meta: {}, correlationId: 'x' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getContentPageBySlug('chinh-sach-huy');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/public/content-pages/chinh-sach-huy');
    expect(result).toEqual(page);
  });

  it('returns null on a 404 instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 404)));
    await expect(getContentPageBySlug('missing')).resolves.toBeNull();
  });

  it('throws on a non-404 failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)));
    await expect(getContentPageBySlug('x')).rejects.toThrow('PUBLIC_CONTENT_PAGE_FAILED');
  });
});

describe('paragraphsFromText', () => {
  it('splits plain text on blank lines and trims each paragraph', () => {
    expect(paragraphsFromText('  Đoạn một.  \n\n  Đoạn hai.  ')).toEqual(['Đoạn một.', 'Đoạn hai.']);
  });
});

describe('truncateForDescription', () => {
  it('returns short text unchanged', () => {
    expect(truncateForDescription('Ngắn gọn.')).toBe('Ngắn gọn.');
  });

  it('truncates long text with an ellipsis at the given length', () => {
    const long = 'a'.repeat(200);
    const result = truncateForDescription(long, 155);
    expect(result.length).toBe(156); // 155 chars + '…'
    expect(result.endsWith('…')).toBe(true);
  });
});
