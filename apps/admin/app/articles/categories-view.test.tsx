import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CategoriesListContent } from './categories-view';
import type { ArticleCategory } from './articles-api';

const CATEGORIES: ArticleCategory[] = [
  { id: 'c1', name: 'Kinh nghiệm', slug: 'kinh-nghiem', description: null, sortOrder: 0, status: 'ACTIVE' },
  { id: 'c2', name: 'Đã ẩn', slug: 'da-an', description: null, sortOrder: 1, status: 'INACTIVE' },
];

describe('CategoriesListContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<CategoriesListContent state={{ status: 'loading' }} onRowSave={vi.fn()} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<CategoriesListContent state={{ status: 'error', message: 'Lỗi' }} onRowSave={vi.fn()} />);
    expect(markup).toContain('role="alert"');
  });

  it('renders an empty-state message when there are no categories', () => {
    const markup = renderToStaticMarkup(<CategoriesListContent state={{ status: 'ready', categories: [] }} onRowSave={vi.fn()} />);
    expect(markup).toContain('Chưa có chuyên mục nào.');
  });

  it('renders one row per category', () => {
    const markup = renderToStaticMarkup(<CategoriesListContent state={{ status: 'ready', categories: CATEGORIES }} onRowSave={vi.fn()} />);
    expect(markup).toContain('kinh-nghiem');
    expect(markup).toContain('da-an');
  });
});
