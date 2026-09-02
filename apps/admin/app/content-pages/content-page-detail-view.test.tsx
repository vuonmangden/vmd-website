import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ContentPageDetailContent } from './content-page-detail-view';
import type { ContentPageDetail } from './content-pages-api';

const PAGE: ContentPageDetail = {
  id: 'p1', slug: 'chinh-sach', title: 'Chính sách', body: 'Nội dung chính sách',
  status: 'DRAFT', publishedAt: null, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
};

const NOOP_PROPS = {
  title: '', onTitleChange: vi.fn(),
  body: '', onBodyChange: vi.fn(),
  busy: false, saved: false,
  onSave: vi.fn(), onPublish: vi.fn(), onUnpublish: vi.fn(), onArchive: vi.fn(),
};

describe('ContentPageDetailContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<ContentPageDetailContent state={{ status: 'loading' }} {...NOOP_PROPS} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<ContentPageDetailContent state={{ status: 'error', message: 'Lỗi' }} {...NOOP_PROPS} />);
    expect(markup).toContain('role="alert"');
  });

  it('offers "Xuất bản" and hides "Chuyển về nháp" for a draft page', () => {
    const markup = renderToStaticMarkup(
      <ContentPageDetailContent state={{ status: 'ready', page: PAGE }} {...NOOP_PROPS} title="Chính sách" body="Nội dung chính sách" />,
    );
    expect(markup).toContain('/chinh-sach');
    expect(markup).toContain('status-badge-draft');
    expect(markup).toContain('Xuất bản');
    expect(markup).not.toContain('Chuyển về nháp');
    expect(markup).toContain('Lưu trữ');
  });

  it('offers "Chuyển về nháp" and hides "Xuất bản" for a published page', () => {
    const markup = renderToStaticMarkup(
      <ContentPageDetailContent state={{ status: 'ready', page: { ...PAGE, status: 'PUBLISHED' } }} {...NOOP_PROPS} />,
    );
    expect(markup).toContain('status-badge-published');
    expect(markup).toContain('Chuyển về nháp');
    expect(markup).not.toContain('>Xuất bản<');
  });

  it('shows a saved confirmation after a successful save', () => {
    const markup = renderToStaticMarkup(<ContentPageDetailContent state={{ status: 'ready', page: PAGE }} {...NOOP_PROPS} saved />);
    expect(markup).toContain('Đã lưu');
  });

  it('surfaces an action error alongside the form, not in place of it', () => {
    const markup = renderToStaticMarkup(
      <ContentPageDetailContent state={{ status: 'ready', page: PAGE }} {...NOOP_PROPS} actionError="Không có quyền" />,
    );
    expect(markup).toContain('Không có quyền');
    expect(markup).toContain('/chinh-sach');
  });
});
