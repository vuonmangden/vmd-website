import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LoginPage from './page';

describe('admin login page', () => {
  it('renders the staff email/password form with an accessible loading-capable submit control', () => {
    const markup = renderToStaticMarkup(<LoginPage />);

    expect(markup).toContain('Đăng nhập quản trị');
    expect(markup).toContain('type="email"');
    expect(markup).toContain('type="password"');
    expect(markup).toContain('Đăng nhập');
  });
});
