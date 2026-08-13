import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PaymentPage from './page';

describe('public payment page', () => {
  it('has a labelled Vietnamese fallback and no bank account or provider transaction fields', () => {
    const html = renderToStaticMarkup(<PaymentPage />);
    expect(html).toContain('Đang chuẩn bị trang thanh toán');
    expect(html).not.toContain('tài khoản ngân hàng');
    expect(html).not.toContain('provider transaction');
  });
});
