import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Page from './page';

describe('admin shell', () => {
  it('starts in an accessible protected-route loading state', () => {
    const markup = renderToStaticMarkup(<Page />);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('Đang kiểm tra phiên đăng nhập');
  });
});
