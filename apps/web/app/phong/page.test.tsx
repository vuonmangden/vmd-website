import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoomsPage from './page';

describe('public rooms page', () => {
  it('renders production room pricing and a mobile-safe public search route', () => {
    const html = renderToStaticMarkup(<RoomsPage />);
    expect(html).toContain('Kiểm tra phòng trống');
    expect(html).toContain('Ngày nhận phòng');
    expect(html).toContain('Ngày trả phòng');
    expect(html).toContain('Số khách');
    expect(html).toContain('chưa gồm VAT');
    expect(html).not.toContain('sandbox');
  });
});
