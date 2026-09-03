'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { roleName } from './roles';
import { listStaff } from './staff-api';
import type { StaffListResult } from './staff-api';

const STATUS_OPTIONS = ['', 'INVITED', 'ACTIVE', 'SUSPENDED'];

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; result: StaffListResult };

export function StaffListView() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    listStaff({ status: statusFilter || undefined, page })
      .then((result) => { if (!cancelled) setState({ status: 'ready', result }); })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải danh sách' });
      });
    return () => { cancelled = true; };
  }, [statusFilter, page]);

  return (
    <div className="bookings-page">
      <div className="articles-toolbar">
        <label>
          Trạng thái
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option || 'Tất cả'}</option>)}
          </select>
        </label>
        <Link href="/staff/invite" className="link-button">+ Mời nhân viên</Link>
      </div>
      <StaffListContent state={state} page={page} onPageChange={setPage} />
    </div>
  );
}

export function StaffListContent({ state, page, onPageChange }: { state: ViewState; page: number; onPageChange: (page: number) => void }) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải danh sách…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  const { result } = state;
  const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <>
      {result.items.length === 0 ? (
        <p>Không có nhân viên nào khớp bộ lọc.</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng nhập gần nhất</th></tr>
          </thead>
          <tbody>
            {result.items.map((staff) => (
              <tr key={staff.id}>
                <td><Link href={`/staff/${staff.id}`}>{staff.fullName}</Link></td>
                <td>{staff.email}</td>
                <td>{staff.roles.length > 0 ? staff.roles.map(roleName).join(', ') : '—'}</td>
                <td><span className={`status-badge status-badge-${staff.status.toLowerCase()}`}>{staff.status}</span></td>
                <td>{staff.lastLoginAt ? staff.lastLoginAt.slice(0, 19).replace('T', ' ') : 'Chưa đăng nhập'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="bookings-pagination">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Trước</button>
        <span>Trang {page}/{lastPage} · {result.total} nhân viên</span>
        <button type="button" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>Sau →</button>
      </div>
    </>
  );
}
