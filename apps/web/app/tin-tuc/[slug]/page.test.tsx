import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as articleApi from '../article-api';
import ArticleDetailPage, { generateMetadata } from './page';

const ARTICLE = {
  slug: 'khai-truong',
  title: 'Khai trương Vườn Măng Đen',
  excerpt: 'Chào mừng bạn tới Vườn Măng Đen.',
  publishedAt: '2026-08-01T00:00:00.000Z',
  category: { name: 'Tin tức', slug: 'tin-tuc' },
  content: { text: 'Đoạn một.\n\nĐoạn hai.' },
  seoTitle: null,
  seoDescription: null,
  canonicalUrl: null,
};

function params(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }) }));

describe('generateMetadata', () => {
  it('falls back to title/excerpt and a self-referencing canonical when no SEO fields are set', async () => {
    vi.spyOn(articleApi, 'getArticleBySlug').mockResolvedValue(ARTICLE);

    const metadata = await generateMetadata(params('khai-truong'));

    expect(metadata.title).toBe('Khai trương Vườn Măng Đen');
    expect(metadata.description).toBe('Chào mừng bạn tới Vườn Măng Đen.');
    expect(metadata.alternates?.canonical).toBe('http://localhost:3000/tin-tuc/khai-truong');
  });

  it('prefers the dedicated seoTitle/seoDescription/canonicalUrl fields when set', async () => {
    vi.spyOn(articleApi, 'getArticleBySlug').mockResolvedValue({
      ...ARTICLE,
      seoTitle: 'Tiêu đề SEO riêng',
      seoDescription: 'Mô tả SEO riêng.',
      canonicalUrl: 'https://vuonmangden.vn/khai-truong-2026',
    });

    const metadata = await generateMetadata(params('khai-truong'));

    expect(metadata.title).toBe('Tiêu đề SEO riêng');
    expect(metadata.description).toBe('Mô tả SEO riêng.');
    expect(metadata.alternates?.canonical).toBe('https://vuonmangden.vn/khai-truong-2026');
  });

  it('returns a not-found title without throwing when the slug does not exist', async () => {
    vi.spyOn(articleApi, 'getArticleBySlug').mockResolvedValue(null);

    const metadata = await generateMetadata(params('missing'));

    expect(metadata.title).toBe('Không tìm thấy bài viết');
  });
});

describe('ArticleDetailPage', () => {
  it('renders the title, category, date and body paragraphs, plus Article JSON-LD', async () => {
    vi.spyOn(articleApi, 'getArticleBySlug').mockResolvedValue(ARTICLE);

    const html = renderToStaticMarkup(await ArticleDetailPage(params('khai-truong')));

    expect(html).toContain('Khai trương Vườn Măng Đen');
    expect(html).toContain('Tin tức');
    expect(html).toContain('Đoạn một.');
    expect(html).toContain('Đoạn hai.');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"Article"');
  });

  it('calls notFound() for an unknown slug instead of rendering a broken page', async () => {
    vi.spyOn(articleApi, 'getArticleBySlug').mockResolvedValue(null);

    await expect(ArticleDetailPage(params('missing'))).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
