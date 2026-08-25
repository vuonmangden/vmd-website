import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as articleApi from './article-api';
import ArticlesPage from './page';

describe('public articles list page', () => {
  it('renders each published article with a link to its detail page', async () => {
    vi.spyOn(articleApi, 'listArticles').mockResolvedValue([
      { slug: 'khai-truong', title: 'Khai trương Vườn Măng Đen', excerpt: 'Chào mừng.', publishedAt: '2026-08-01T00:00:00.000Z', category: { name: 'Tin tức', slug: 'tin-tuc' } },
    ]);

    const html = renderToStaticMarkup(await ArticlesPage());

    expect(html).toContain('Khai trương Vườn Măng Đen');
    expect(html).toContain('href="/tin-tuc/khai-truong"');
    expect(html).toContain('Chào mừng.');
  });

  it('shows an empty state instead of crashing when there are no articles', async () => {
    vi.spyOn(articleApi, 'listArticles').mockResolvedValue([]);

    const html = renderToStaticMarkup(await ArticlesPage());

    expect(html).toContain('Chưa có bài viết nào');
  });

  it('degrades to an empty list rather than a failed page when the API is unreachable', async () => {
    vi.spyOn(articleApi, 'listArticles').mockRejectedValue(new Error('PUBLIC_ARTICLES_LIST_FAILED'));

    const html = renderToStaticMarkup(await ArticlesPage());

    expect(html).toContain('Chưa có bài viết nào');
  });
});
