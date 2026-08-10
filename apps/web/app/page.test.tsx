import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ErrorPage from './error';
import Loading from './loading';
import NotFound from './not-found';
import Page from './page';

describe('public web layout', () => {
  const html = renderToStaticMarkup(<Page />);

  it('renders approved brand and introductory content', () => {
    expect(html).toContain('Vườn Măng Đen');
    expect(html).toContain('Nơi nghỉ dưỡng, giao lưu kết nối bạn bè');
    expect(html).toContain('Logo Vườn Măng Đen — Homestay &amp; BBQ');
  });

  it('renders semantic navigation, contact links and approved public destinations', () => {
    expect(html).toContain('aria-label="Điều hướng chính"');
    expect(html).toContain('href="tel:19009085"');
    expect(html).toContain('href="mailto:vuongmangden.com@gmail.com"');
    expect(html).toContain('https://www.facebook.com/MangDenGarden/');
    expect(html).toContain('https://www.tiktok.com/@vuonmangden');
    expect(html).toContain('https://www.instagram.com/vuonmangden');
    expect(html).toContain('https://maps.app.goo.gl/DtzdH58QEz2p1iYW8');
  });

  it('provides loading, error and not-found states in Vietnamese', () => {
    expect(renderToStaticMarkup(<Loading />)).toContain('Đang tải nội dung');
    expect(renderToStaticMarkup(<NotFound />)).toContain('Không tìm thấy trang');
    expect(renderToStaticMarkup(<ErrorPage error={new Error('test')} reset={() => undefined} />)).toContain(
      'Không thể tải nội dung',
    );
  });
});
