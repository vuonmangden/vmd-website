import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BookingPage from './page';

describe('public room checkout page', () => {
  it('identifies the sandbox flow and offers an accessible checkout route', () => {
    const html = renderToStaticMarkup(<BookingPage />);
    expect(html).toContain('Đặt phòng demo');
    expect(html).toContain('dữ liệu phòng và thanh toán sandbox');
  });
});
