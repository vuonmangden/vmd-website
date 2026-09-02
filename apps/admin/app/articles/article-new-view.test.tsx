import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ArticleNewContent } from './article-new-view';
import type { ArticleCategory } from './articles-api';

const CATEGORIES: ArticleCategory[] = [
  { id: 'c1', name: 'Kinh nghiệm', slug: 'kinh-nghiem', description: null, sortOrder: 0, status: 'ACTIVE' },
  { id: 'c2', name: 'Đã ẩn', slug: 'da-an', description: null, sortOrder: 1, status: 'INACTIVE' },
];

const NOOP_PROPS = {
  categoriesState: { status: 'ready' as const, categories: CATEGORIES },
  slug: '', onSlugChange: vi.fn(),
  title: '', onTitleChange: vi.fn(),
  contentText: '', onContentTextChange: vi.fn(),
  excerpt: '', onExcerptChange: vi.fn(),
  categoryId: '', onCategoryIdChange: vi.fn(),
  seoTitle: '', onSeoTitleChange: vi.fn(),
  seoDescription: '', onSeoDescriptionChange: vi.fn(),
  canonicalUrl: '', onCanonicalUrlChange: vi.fn(),
  busy: false, onSubmit: vi.fn(),
};

describe('ArticleNewContent', () => {
  it('renders only active categories as selectable options', () => {
    const markup = renderToStaticMarkup(<ArticleNewContent {...NOOP_PROPS} />);
    expect(markup).toContain('Kinh nghiệm');
    expect(markup).not.toContain('Đã ẩn');
  });

  it('disables the category select while categories are loading', () => {
    const markup = renderToStaticMarkup(<ArticleNewContent {...NOOP_PROPS} categoriesState={{ status: 'loading' }} />);
    expect(markup).toMatch(/<select[^>]*disabled=""/);
  });

  it('shows the categories error without blocking the rest of the form', () => {
    const markup = renderToStaticMarkup(<ArticleNewContent {...NOOP_PROPS} categoriesState={{ status: 'error', message: 'Không thể tải chuyên mục' }} />);
    expect(markup).toContain('Không thể tải chuyên mục');
    expect(markup).toContain('Tạo bài viết');
  });

  it('renders the slug, title, and content fields with their current values', () => {
    const markup = renderToStaticMarkup(<ArticleNewContent {...NOOP_PROPS} slug="bai-moi" title="Bài mới" contentText="Nội dung" />);
    expect(markup).toContain('value="bai-moi"');
    expect(markup).toContain('value="Bài mới"');
    expect(markup).toContain('Nội dung');
  });

  it('renders an error alongside the form, not in place of it', () => {
    const markup = renderToStaticMarkup(<ArticleNewContent {...NOOP_PROPS} error="Slug đã tồn tại" />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Slug đã tồn tại');
    expect(markup).toContain('Tạo bài viết');
  });
});
