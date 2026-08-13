import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoomsPage from './page';

describe('public rooms page', () => {
  it('renders labelled sandbox search controls and a mobile-safe public route', () => {
    const html = renderToStaticMarkup(<RoomsPage />);
    expect(html).toContain('Kiểm tra phòng sandbox');
    expect(html).toContain('Ngày nhận phòng');
    expect(html).toContain('Ngày trả phòng');
    expect(html).toContain('Số khách');
    expect(html).toContain('dữ liệu sandbox');
  });
});
