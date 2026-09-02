import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ArticleDetailContent } from './article-detail-view';
import type { ArticleDetail, ArticleCategory } from './articles-api';

const ARTICLE: ArticleDetail = {
  id: 'a1', categoryId: null, title: 'Bài viết mẫu', slug: 'bai-viet-mau',
  excerpt: null, content: { text: 'Nội dung mẫu' }, coverMediaId: null, authorId: null,
  status: 'DRAFT', seoTitle: null, seoDescription: null, canonicalUrl: null,
  publishedAt: null, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
};

const CATEGORIES: ArticleCategory[] = [
  { id: 'c1', name: 'Kinh nghiệm', slug: 'kinh-nghiem', description: null, sortOrder: 0, status: 'ACTIVE' },
];

const NOOP_PROPS = {
  categoriesState: { status: 'ready' as const, categories: CATEGORIES },
  title: '', onTitleChange: vi.fn(),
  contentText: '', onContentTextChange: vi.fn(),
  excerpt: '', onExcerptChange: vi.fn(),
  categoryId: '', onCategoryIdChange: vi.fn(),
  seoTitle: '', onSeoTitleChange: vi.fn(),
  seoDescription: '', onSeoDescriptionChange: vi.fn(),
  canonicalUrl: '', onCanonicalUrlChange: vi.fn(),
  busy: false, saved: false,
  onSave: vi.fn(), onPublish: vi.fn(), onUnpublish: vi.fn(), onArchive: vi.fn(),
};

describe('ArticleDetailContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<ArticleDetailContent state={{ status: 'loading' }} {...NOOP_PROPS} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<ArticleDetailContent state={{ status: 'error', message: 'Lỗi' }} {...NOOP_PROPS} />);
    expect(markup).toContain('role="alert"');
  });

  it('offers "Xuất bản" and hides "Chuyển về nháp" for a draft article', () => {
    const markup = renderToStaticMarkup(
      <ArticleDetailContent state={{ status: 'ready', article: ARTICLE }} {...NOOP_PROPS} title="Bài viết mẫu" contentText="Nội dung mẫu" />,
    );
    expect(markup).toContain('/bai-viet-mau');
    expect(markup).toContain('status-badge-draft');
    expect(markup).toContain('Xuất bản');
    expect(markup).not.toContain('Chuyển về nháp');
    expect(markup).toContain('Lưu trữ');
  });

  it('offers "Chuyển về nháp" and hides "Xuất bản" for a published article', () => {
    const markup = renderToStaticMarkup(
      <ArticleDetailContent state={{ status: 'ready', article: { ...ARTICLE, status: 'PUBLISHED' } }} {...NOOP_PROPS} />,
    );
    expect(markup).toContain('status-badge-published');
    expect(markup).toContain('Chuyển về nháp');
    expect(markup).not.toContain('>Xuất bản<');
  });

  it('shows a saved confirmation after a successful save', () => {
    const markup = renderToStaticMarkup(<ArticleDetailContent state={{ status: 'ready', article: ARTICLE }} {...NOOP_PROPS} saved />);
    expect(markup).toContain('Đã lưu');
  });

  it('surfaces an action error alongside the form, not in place of it', () => {
    const markup = renderToStaticMarkup(
      <ArticleDetailContent state={{ status: 'ready', article: ARTICLE }} {...NOOP_PROPS} actionError="Không có quyền" />,
    );
    expect(markup).toContain('Không có quyền');
    expect(markup).toContain('/bai-viet-mau');
  });

  it('keeps the article\'s current category selectable even if it has since gone inactive', () => {
    const inactiveCategories: ArticleCategory[] = [{ id: 'c2', name: 'Ẩn rồi', slug: 'an-roi', description: null, sortOrder: 0, status: 'INACTIVE' }];
    const markup = renderToStaticMarkup(
      <ArticleDetailContent
        state={{ status: 'ready', article: { ...ARTICLE, categoryId: 'c2' } }}
        {...NOOP_PROPS}
        categoriesState={{ status: 'ready', categories: inactiveCategories }}
        categoryId="c2"
      />,
    );
    expect(markup).toContain('Ẩn rồi');
  });
});
