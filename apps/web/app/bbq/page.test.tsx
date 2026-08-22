import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BbqPage from './page';

describe('public BBQ page', () => {
  it('renders labelled sandbox search controls and a mobile-safe public route', () => {
    const html = renderToStaticMarkup(<BbqPage />);
    expect(html).toContain('Kiểm tra bàn BBQ sandbox');
    expect(html).toContain('Giờ bắt đầu');
    expect(html).toContain('Giờ kết thúc');
    expect(html).toContain('Số khách');
    expect(html).toContain('dữ liệu sandbox');
  });
});
