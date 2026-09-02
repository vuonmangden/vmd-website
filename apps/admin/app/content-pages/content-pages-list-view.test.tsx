import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ContentPagesListContent } from './content-pages-list-view';
import type { ContentPageSummary } from './content-pages-api';

const PAGES: ContentPageSummary[] = [
  { id: 'p1', slug: 'chinh-sach', title: 'Chính sách', status: 'PUBLISHED', publishedAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z' },
  { id: 'p2', slug: 'nhap', title: 'Bản nháp', status: 'DRAFT', publishedAt: null, updatedAt: '2026-08-22T00:00:00.000Z' },
];

describe('ContentPagesListContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<ContentPagesListContent state={{ status: 'loading' }} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<ContentPagesListContent state={{ status: 'error', message: 'Lỗi' }} />);
    expect(markup).toContain('role="alert"');
  });

  it('renders an empty-state message when there are no pages', () => {
    const markup = renderToStaticMarkup(<ContentPagesListContent state={{ status: 'ready', pages: [] }} />);
    expect(markup).toContain('Chưa có trang nội dung nào.');
  });

  it('renders every page with its slug, title, and status', () => {
    const markup = renderToStaticMarkup(<ContentPagesListContent state={{ status: 'ready', pages: PAGES }} />);
    expect(markup).toContain('chinh-sach');
    expect(markup).toContain('Chính sách');
    expect(markup).toContain('status-badge-published');
    expect(markup).toContain('nhap');
    expect(markup).toContain('status-badge-draft');
  });
});
