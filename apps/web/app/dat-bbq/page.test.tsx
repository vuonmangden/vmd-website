import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BbqBookingPage, { metadata } from './page';

describe('public BBQ checkout page', () => {
  it('identifies the sandbox flow and offers an accessible checkout route', () => {
    const html = renderToStaticMarkup(<BbqBookingPage />);
    expect(html).toContain('Đặt bàn BBQ demo');
    expect(html).toContain('dữ liệu bàn BBQ và thanh toán sandbox');
  });

  it('is excluded from search indexing — a transactional page, not content', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
