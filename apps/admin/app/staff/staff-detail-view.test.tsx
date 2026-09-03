import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { StaffDetailContent } from './staff-detail-view';
import type { StaffDetail } from './staff-api';

const STAFF: StaffDetail = {
  id: 's1', fullName: 'Nguyễn Văn A', email: 'a@vuonmangden.com', status: 'ACTIVE',
  lastLoginAt: '2026-08-20T08:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-20T08:00:00.000Z',
  roleAssignments: [{ assignedAt: '2026-08-01T00:00:00.000Z', role: { code: 'RECEPTION', name: 'Reception / Operations' }, assigner: { id: 's2', fullName: 'Trần Thị B' } }],
};

const NOOP_PROPS = {
  currentStaffId: 's2',
  newStatus: 'ACTIVE', onNewStatusChange: vi.fn(),
  statusReason: '', onStatusReasonChange: vi.fn(),
  assignRoleCode: '', onAssignRoleCodeChange: vi.fn(),
  busy: false,
  onChangeStatus: vi.fn(), onAssignRole: vi.fn(), onRevokeRole: vi.fn(),
};

describe('StaffDetailContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<StaffDetailContent state={{ status: 'loading' }} {...NOOP_PROPS} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<StaffDetailContent state={{ status: 'error', message: 'Lỗi' }} {...NOOP_PROPS} />);
    expect(markup).toContain('role="alert"');
  });

  it('renders profile facts, assigned roles, and offers status/role controls for another staff member', () => {
    const markup = renderToStaticMarkup(<StaffDetailContent state={{ status: 'ready', staff: STAFF }} {...NOOP_PROPS} />);
    expect(markup).toContain('Nguyễn Văn A');
    expect(markup).toContain('a@vuonmangden.com');
    expect(markup).toContain('status-badge-active');
    expect(markup).toContain('Reception / Operations');
    expect(markup).toContain('Gán bởi Trần Thị B');
    expect(markup).toContain('Cập nhật trạng thái');
    expect(markup).toContain('Gán vai trò');
    expect(markup).toContain('Thu hồi');
  });

  it('hides status and role controls, and explains why, when viewing your own profile', () => {
    const markup = renderToStaticMarkup(<StaffDetailContent state={{ status: 'ready', staff: STAFF }} {...NOOP_PROPS} currentStaffId="s1" />);
    expect(markup).toContain('Không thể tự thay đổi trạng thái hoặc vai trò của chính bạn.');
    expect(markup).not.toContain('Cập nhật trạng thái');
    expect(markup).not.toContain('Thu hồi');
  });

  it('excludes already-assigned roles from the assignable-role select', () => {
    const markup = renderToStaticMarkup(<StaffDetailContent state={{ status: 'ready', staff: STAFF }} {...NOOP_PROPS} />);
    expect(markup).not.toMatch(/<option value="RECEPTION">/);
    expect(markup).toContain('<option value="MANAGER">');
  });

  it('surfaces an action error alongside the profile, not in place of it', () => {
    const markup = renderToStaticMarkup(<StaffDetailContent state={{ status: 'ready', staff: STAFF }} {...NOOP_PROPS} actionError="Không có quyền" />);
    expect(markup).toContain('Không có quyền');
    expect(markup).toContain('Nguyễn Văn A');
  });
});
