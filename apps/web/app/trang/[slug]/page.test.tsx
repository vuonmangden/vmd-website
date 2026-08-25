import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as contentPageApi from '../content-page-api';
import ContentPageDetail, { generateMetadata } from './page';

const PAGE = { slug: 'chinh-sach-huy', title: 'Chính sách hủy phòng', body: 'Đoạn một.\n\nĐoạn hai.', publishedAt: '2026-08-01T00:00:00.000Z' };

function params(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }) }));

describe('generateMetadata', () => {
  it('derives title and a truncated description from the page body', async () => {
    vi.spyOn(contentPageApi, 'getContentPageBySlug').mockResolvedValue(PAGE);

    const metadata = await generateMetadata(params('chinh-sach-huy'));

    expect(metadata.title).toBe('Chính sách hủy phòng');
    expect(metadata.description).toBe('Đoạn một.\n\nĐoạn hai.');
    expect(metadata.alternates?.canonical).toBe('http://localhost:3000/trang/chinh-sach-huy');
  });

  it('returns a not-found title without throwing when the slug does not exist', async () => {
    vi.spyOn(contentPageApi, 'getContentPageBySlug').mockResolvedValue(null);

    const metadata = await generateMetadata(params('missing'));

    expect(metadata.title).toBe('Không tìm thấy trang');
  });
});

describe('ContentPageDetail', () => {
  it('renders the title and body paragraphs, plus WebPage JSON-LD', async () => {
    vi.spyOn(contentPageApi, 'getContentPageBySlug').mockResolvedValue(PAGE);

    const html = renderToStaticMarkup(await ContentPageDetail(params('chinh-sach-huy')));

    expect(html).toContain('Chính sách hủy phòng');
    expect(html).toContain('Đoạn một.');
    expect(html).toContain('Đoạn hai.');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"WebPage"');
  });

  it('calls notFound() for an unknown slug instead of rendering a broken page', async () => {
    vi.spyOn(contentPageApi, 'getContentPageBySlug').mockResolvedValue(null);

    await expect(ContentPageDetail(params('missing'))).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
