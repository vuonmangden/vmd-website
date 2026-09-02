import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BookingPage, { metadata } from './page';

describe('public room checkout page', () => {
  it('identifies the production booking flow without sandbox wording', () => {
    const html = renderToStaticMarkup(<BookingPage />);
    expect(html).toContain('Đặt phòng trực tuyến');
    expect(html).toContain('Giá, phòng trống và mức cọc');
    expect(html).not.toContain('sandbox');
  });

  it('is excluded from search indexing — a transactional page, not content', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
