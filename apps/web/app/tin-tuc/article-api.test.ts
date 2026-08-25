import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatArticleDate, getArticleBySlug, listArticles, paragraphsFromContent, paragraphsFromText } from './article-api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('listArticles', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('calls the API under /api/v1 and unwraps the { data } envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: [{ slug: 'a', title: 'A', excerpt: null, publishedAt: '2026-08-01T00:00:00.000Z', category: null }], meta: {}, correlationId: 'x' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await listArticles();

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/public/articles');
    expect(result).toHaveLength(1);
  });

  it('throws on a non-ok response rather than silently returning nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)));
    await expect(listArticles()).rejects.toThrow('PUBLIC_ARTICLES_LIST_FAILED');
  });
});

describe('getArticleBySlug', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('URL-encodes the slug and unwraps the envelope', async () => {
    const article = { slug: 'mang-den', title: 'Măng Đen', excerpt: null, publishedAt: '2026-08-01T00:00:00.000Z', category: null, content: {}, seoTitle: null, seoDescription: null, canonicalUrl: null };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: article, meta: {}, correlationId: 'x' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getArticleBySlug('bài viết');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/public/articles/b%C3%A0i%20vi%E1%BA%BFt');
    expect(result).toEqual(article);
  });

  it('returns null on a 404 instead of throwing, so callers can render a real not-found page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 404)));
    await expect(getArticleBySlug('missing')).resolves.toBeNull();
  });

  it('throws on a non-404 failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)));
    await expect(getArticleBySlug('x')).rejects.toThrow('PUBLIC_ARTICLE_DETAIL_FAILED');
  });
});

describe('paragraphsFromContent', () => {
  it('splits the { text } convention on blank lines', () => {
    expect(paragraphsFromContent({ text: 'Đoạn một.\n\nĐoạn hai.' })).toEqual(['Đoạn một.', 'Đoạn hai.']);
  });

  it('returns an empty array for any other shape rather than throwing', () => {
    expect(paragraphsFromContent({ blocks: [] })).toEqual([]);
    expect(paragraphsFromContent(null)).toEqual([]);
    expect(paragraphsFromContent('a plain string')).toEqual([]);
  });
});

describe('paragraphsFromText', () => {
  it('drops empty paragraphs from repeated blank lines', () => {
    expect(paragraphsFromText('A\n\n\n\nB')).toEqual(['A', 'B']);
  });
});

describe('formatArticleDate', () => {
  it('formats an ISO date as dd/mm/yyyy', () => {
    expect(formatArticleDate('2026-08-23T10:00:00.000Z')).toBe('23/08/2026');
  });

  it('returns an empty string for an invalid date rather than "Invalid Date"', () => {
    expect(formatArticleDate('not-a-date')).toBe('');
  });
});
