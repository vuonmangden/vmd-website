import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminRouteState } from './admin-route';

describe('AdminRouteState', () => {
  it.each([
    ['loading', 'Đang kiểm tra phiên đăng nhập'],
    ['unauthorized', 'Phiên đăng nhập đã hết hạn'],
    ['forbidden', 'Không có quyền truy cập'],
    ['unavailable', 'Dịch vụ tạm thời gián đoạn'],
  ] as const)('renders the %s state', (state, expected) => {
    expect(renderToStaticMarkup(<AdminRouteState state={state}>Nội dung</AdminRouteState>)).toContain(expected);
  });

  it('renders protected content only when authorized', () => {
    expect(renderToStaticMarkup(<AdminRouteState state="authorized"><p>Nội dung</p></AdminRouteState>))
      .toContain('Nội dung');
  });
});
