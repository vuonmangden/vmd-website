'use client';

import { useEffect, useState } from 'react';
import { useCurrentActor } from '../admin-route';
import { ApiError } from '../lib/api-client';
import { ROLE_OPTIONS } from './roles';
import { assignStaffRole, changeStaffStatus, getStaff, revokeStaffRole } from './staff-api';
import type { StaffDetail } from './staff-api';

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; staff: StaffDetail };

const STAFF_STATUS_OPTIONS = ['INVITED', 'ACTIVE', 'SUSPENDED'];

export function StaffDetailView({ id }: { id: string }) {
  const actor = useCurrentActor();
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [assignRoleCode, setAssignRoleCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();

  function load(): void {
    setState({ status: 'loading' });
    getStaff(id)
      .then((staff) => setState({ status: 'ready', staff }))
      .catch((error: unknown) => setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải nhân viên' }));
  }

  useEffect(load, [id]);

  async function handleChangeStatus(): Promise<void> {
    setBusy(true);
    setActionError(undefined);
    try {
      await changeStaffStatus(id, newStatus, statusReason.trim() || undefined);
      setStatusReason('');
      load();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Đổi trạng thái thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignRole(roleCode: string): Promise<void> {
    setBusy(true);
    setActionError(undefined);
    try {
      await assignStaffRole(id, roleCode);
      setAssignRoleCode('');
      load();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Gán vai trò thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeRole(roleCode: string): Promise<void> {
    setBusy(true);
    setActionError(undefined);
    try {
      await revokeStaffRole(id, roleCode);
      load();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Thu hồi vai trò thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <StaffDetailContent
      state={state}
      currentStaffId={actor.staffProfileId}
      newStatus={newStatus}
      onNewStatusChange={setNewStatus}
      statusReason={statusReason}
      onStatusReasonChange={setStatusReason}
      assignRoleCode={assignRoleCode}
      onAssignRoleCodeChange={setAssignRoleCode}
      busy={busy}
      actionError={actionError}
      onChangeStatus={() => void handleChangeStatus()}
      onAssignRole={(roleCode) => void handleAssignRole(roleCode)}
      onRevokeRole={(roleCode) => void handleRevokeRole(roleCode)}
    />
  );
}

export function StaffDetailContent({
  state, currentStaffId,
  newStatus, onNewStatusChange,
  statusReason, onStatusReasonChange,
  assignRoleCode, onAssignRoleCodeChange,
  busy, actionError,
  onChangeStatus, onAssignRole, onRevokeRole,
}: {
  state: ViewState;
  currentStaffId: string;
  newStatus: string;
  onNewStatusChange: (value: string) => void;
  statusReason: string;
  onStatusReasonChange: (value: string) => void;
  assignRoleCode: string;
  onAssignRoleCodeChange: (value: string) => void;
  busy: boolean;
  actionError?: string;
  onChangeStatus: () => void;
  onAssignRole: (roleCode: string) => void;
  onRevokeRole: (roleCode: string) => void;
}) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải nhân viên…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  const { staff } = state;
  const isSelf = staff.id === currentStaffId;
  const assignedCodes = new Set(staff.roleAssignments.map((assignment) => assignment.role.code));
  const assignableRoles = ROLE_OPTIONS.filter((role) => !assignedCodes.has(role.code));
  const selectedAssignRoleCode = assignRoleCode || assignableRoles[0]?.code || '';

  return (
    <div className="content-page-detail">
      <div className="content-page-detail-header">
        <div>
          <p className="content-page-slug">{staff.fullName}</p>
          <span className={`status-badge status-badge-${staff.status.toLowerCase()}`}>{staff.status}</span>
        </div>
      </div>

      {actionError ? <p role="alert" className="dashboard-error">{actionError}</p> : null}

      <dl className="booking-facts">
        <div><dt>Email</dt><dd>{staff.email}</dd></div>
        <div><dt>Tham gia</dt><dd>{staff.createdAt.slice(0, 10)}</dd></div>
        <div><dt>Đăng nhập gần nhất</dt><dd>{staff.lastLoginAt ? staff.lastLoginAt.slice(0, 19).replace('T', ' ') : 'Chưa đăng nhập'}</dd></div>
      </dl>

      {isSelf ? (
        <p className="setting-disabled-reason">Không thể tự thay đổi trạng thái hoặc vai trò của chính bạn.</p>
      ) : (
        <>
          <div className="cancel-panel">
            <h2 className="dashboard-section-title">Đổi trạng thái</h2>
            <label>
              Trạng thái mới
              <select value={newStatus} onChange={(event) => onNewStatusChange(event.target.value)} disabled={busy}>
                {STAFF_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>
              Lý do (không bắt buộc)
              <textarea value={statusReason} onChange={(event) => onStatusReasonChange(event.target.value)} disabled={busy} />
            </label>
            <button type="button" onClick={onChangeStatus} disabled={busy}>Cập nhật trạng thái</button>
          </div>

          <div className="cancel-panel">
            <h2 className="dashboard-section-title">Vai trò</h2>
            {staff.roleAssignments.length === 0 ? <p>Chưa gán vai trò nào.</p> : (
              <ul className="status-history">
                {staff.roleAssignments.map((assignment) => (
                  <li key={assignment.role.code}>
                    <span className="status-history-transition">{assignment.role.name}</span>
                    <span className="status-history-date">Gán bởi {assignment.assigner?.fullName ?? '—'} · {assignment.assignedAt.slice(0, 10)}</span>
                    <button type="button" className="button-danger" onClick={() => onRevokeRole(assignment.role.code)} disabled={busy}>Thu hồi</button>
                  </li>
                ))}
              </ul>
            )}
            {assignableRoles.length > 0 ? (
              <div className="assign-role-row">
                <select value={selectedAssignRoleCode} onChange={(event) => onAssignRoleCodeChange(event.target.value)} disabled={busy}>
                  {assignableRoles.map((role) => <option key={role.code} value={role.code}>{role.name}</option>)}
                </select>
                <button type="button" onClick={() => onAssignRole(selectedAssignRoleCode)} disabled={busy}>Gán vai trò</button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
