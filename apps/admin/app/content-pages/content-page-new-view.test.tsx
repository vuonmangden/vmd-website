import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ContentPageNewContent } from './content-page-new-view';

const NOOP_PROPS = {
  slug: '', onSlugChange: vi.fn(),
  title: '', onTitleChange: vi.fn(),
  body: '', onBodyChange: vi.fn(),
  busy: false, onSubmit: vi.fn(),
};

describe('ContentPageNewContent', () => {
  it('renders the slug, title, and body fields with their current values', () => {
    const markup = renderToStaticMarkup(<ContentPageNewContent {...NOOP_PROPS} slug="chinh-sach" title="Chính sách" body="Nội dung" />);
    expect(markup).toContain('value="chinh-sach"');
    expect(markup).toContain('value="Chính sách"');
    expect(markup).toContain('Nội dung');
  });

  it('disables every field while busy', () => {
    const markup = renderToStaticMarkup(<ContentPageNewContent {...NOOP_PROPS} busy />);
    expect(markup.match(/disabled=""/g)?.length).toBe(4);
  });

  it('renders an error alongside the form, not in place of it', () => {
    const markup = renderToStaticMarkup(<ContentPageNewContent {...NOOP_PROPS} error="Slug đã tồn tại" />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Slug đã tồn tại');
    expect(markup).toContain('Tạo trang');
  });
});
