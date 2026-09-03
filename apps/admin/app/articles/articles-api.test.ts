import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  archiveArticle,
  createArticle,
  createArticleCategory,
  extractArticleText,
  getArticle,
  listArticleCategories,
  listArticles,
  publishArticle,
  unpublishArticle,
  updateArticle,
  updateArticleCategory,
} from './articles-api';
import * as authClient from '../lib/auth-client';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

describe('articles-api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists articles from /admin/articles', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await listArticles();

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/articles');
  });

  it('fetches one article by id', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'a1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await getArticle('a1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/articles/a1');
  });

  it('creates an article with the given fields', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'a1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await createArticle({ slug: 'bai-viet-moi', title: 'Bài viết mới', content: { text: 'Nội dung' } });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/articles');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ slug: 'bai-viet-moi', title: 'Bài viết mới', content: { text: 'Nội dung' } });
  });

  it('updates an article with only the given fields', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'a1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await updateArticle('a1', { title: 'Tiêu đề mới', categoryId: null });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/articles/a1/update');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ title: 'Tiêu đề mới', categoryId: null });
  });

  it('publishes, unpublishes, and archives by id', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: { id: 'a1' } })));
    vi.stubGlobal('fetch', fetchMock);

    await publishArticle('a1');
    await unpublishArticle('a1');
    await archiveArticle('a1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/articles/a1/publish');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:3002/api/v1/admin/articles/a1/unpublish');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('http://localhost:3002/api/v1/admin/articles/a1/archive');
  });

  it('lists article categories from /admin/article-categories', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await listArticleCategories();

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/article-categories');
  });

  it('creates an article category', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await createArticleCategory({ name: 'Kinh nghiệm', slug: 'kinh-nghiem' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/article-categories');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ name: 'Kinh nghiệm', slug: 'kinh-nghiem' });
  });

  it('updates an article category', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await updateArticleCategory('c1', { status: 'INACTIVE' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/article-categories/c1/update');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ status: 'INACTIVE' });
  });

  describe('extractArticleText', () => {
    it('reads the text field from a { text } content object', () => {
      expect(extractArticleText({ text: 'Xin chào' })).toBe('Xin chào');
    });

    it('returns an empty string for content without a text field', () => {
      expect(extractArticleText({ blocks: [] })).toBe('');
    });

    it('returns an empty string for null or non-object content', () => {
      expect(extractArticleText(null)).toBe('');
      expect(extractArticleText('plain string')).toBe('');
    });
  });
});
