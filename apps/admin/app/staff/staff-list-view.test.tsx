import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { StaffListContent } from './staff-list-view';
import type { StaffListResult } from './staff-api';

const RESULT: StaffListResult = {
  items: [
    { id: 's1', fullName: 'Nguyễn Văn A', email: 'a@vuonmangden.com', status: 'ACTIVE', lastLoginAt: '2026-08-20T08:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z', roles: ['RECEPTION'] },
    { id: 's2', fullName: 'Trần Thị B', email: 'b@vuonmangden.com', status: 'INVITED', lastLoginAt: null, createdAt: '2026-08-22T00:00:00.000Z', roles: [] },
  ],
  page: 1, pageSize: 50, total: 2,
};

describe('StaffListContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<StaffListContent state={{ status: 'loading' }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<StaffListContent state={{ status: 'error', message: 'Lỗi' }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('role="alert"');
  });

  it('renders an empty-state message when there are no matches', () => {
    const markup = renderToStaticMarkup(
      <StaffListContent state={{ status: 'ready', result: { items: [], page: 1, pageSize: 50, total: 0 } }} page={1} onPageChange={vi.fn()} />,
    );
    expect(markup).toContain('Không có nhân viên nào khớp bộ lọc.');
  });

  it('renders every staff member with their name, resolved role names, status, and last login', () => {
    const markup = renderToStaticMarkup(<StaffListContent state={{ status: 'ready', result: RESULT }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('Nguyễn Văn A');
    expect(markup).toContain('Reception / Operations');
    expect(markup).toContain('status-badge-active');
    expect(markup).toContain('Trần Thị B');
    expect(markup).toContain('status-badge-invited');
    expect(markup).toContain('Chưa đăng nhập');
    expect(markup).toContain('>—<');
  });
});
