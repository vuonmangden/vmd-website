import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ArticlesListContent } from './articles-list-view';
import type { ArticleSummary } from './articles-api';

const ARTICLES: ArticleSummary[] = [
  { id: 'a1', slug: 'bai-1', title: 'Bài viết 1', status: 'PUBLISHED', category: { id: 'c1', name: 'Kinh nghiệm' }, publishedAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z' },
  { id: 'a2', slug: 'bai-2', title: 'Bài viết 2', status: 'DRAFT', category: null, publishedAt: null, updatedAt: '2026-08-22T00:00:00.000Z' },
];

describe('ArticlesListContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<ArticlesListContent state={{ status: 'loading' }} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<ArticlesListContent state={{ status: 'error', message: 'Lỗi' }} />);
    expect(markup).toContain('role="alert"');
  });

  it('renders an empty-state message when there are no articles', () => {
    const markup = renderToStaticMarkup(<ArticlesListContent state={{ status: 'ready', articles: [] }} />);
    expect(markup).toContain('Chưa có bài viết nào.');
  });

  it('renders every article with its title, category, and status; falls back to "—" without a category', () => {
    const markup = renderToStaticMarkup(<ArticlesListContent state={{ status: 'ready', articles: ARTICLES }} />);
    expect(markup).toContain('Bài viết 1');
    expect(markup).toContain('Kinh nghiệm');
    expect(markup).toContain('status-badge-published');
    expect(markup).toContain('Bài viết 2');
    expect(markup).toContain('status-badge-draft');
    expect(markup).toContain('>—<');
  });
});
