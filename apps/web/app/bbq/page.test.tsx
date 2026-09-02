import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BbqPage from './page';

describe('public BBQ page', () => {
  it('renders the production-safe, front-desk-confirmed request flow', () => {
    const html = renderToStaticMarkup(<BbqPage />);
    expect(html).toContain('Gửi yêu cầu đặt BBQ');
    expect(html).toContain('Giờ đến');
    expect(html).toContain('Số khách');
    expect(html).toContain('120 khách mỗi ngày');
    expect(html).toContain('lễ tân sẽ xác nhận booking');
  });
});
