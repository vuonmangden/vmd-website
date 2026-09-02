import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  archiveContentPage,
  createContentPage,
  getContentPage,
  listContentPages,
  publishContentPage,
  unpublishContentPage,
  updateContentPage,
} from './content-pages-api';
import * as authClient from '../lib/auth-client';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

describe('content-pages-api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists content pages from /admin/content-pages', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await listContentPages();

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/content-pages');
  });

  it('fetches one content page by id', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'p1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await getContentPage('p1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/content-pages/p1');
  });

  it('creates a content page with slug, title, and body', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'p1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await createContentPage({ slug: 'chinh-sach', title: 'Chính sách', body: 'Nội dung' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/content-pages');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ slug: 'chinh-sach', title: 'Chính sách', body: 'Nội dung' });
  });

  it('updates a content page with only the given fields', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'p1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await updateContentPage('p1', { title: 'Tiêu đề mới' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/content-pages/p1/update');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ title: 'Tiêu đề mới' });
  });

  it('publishes, unpublishes, and archives by id', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: { id: 'p1' } })));
    vi.stubGlobal('fetch', fetchMock);

    await publishContentPage('p1');
    await unpublishContentPage('p1');
    await archiveContentPage('p1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/content-pages/p1/publish');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:3002/api/v1/admin/content-pages/p1/unpublish');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('http://localhost:3002/api/v1/admin/content-pages/p1/archive');
  });
});
