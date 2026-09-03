'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { formatVnd } from '../lib/format';
import { listBbqReservations } from './bbq-api';
import type { BbqReservationListResult } from './bbq-api';

const STATUS_OPTIONS = ['', 'PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'EXPIRED'];

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; result: BbqReservationListResult };

export function BbqListView() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    listBbqReservations({ status: statusFilter || undefined, page })
      .then((result) => { if (!cancelled) setState({ status: 'ready', result }); })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải danh sách' });
      });
    return () => { cancelled = true; };
  }, [statusFilter, page]);

  return (
    <div className="bookings-page">
      <div className="bookings-toolbar">
        <label>
          Trạng thái
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option || 'Tất cả'}</option>)}
          </select>
        </label>
      </div>
      <BbqListContent state={state} page={page} onPageChange={setPage} />
    </div>
  );
}

export function BbqListContent({ state, page, onPageChange }: { state: ViewState; page: number; onPageChange: (page: number) => void }) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải danh sách…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  const { result } = state;
  const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <>
      {result.items.length === 0 ? (
        <p>Không có đặt bàn nào khớp bộ lọc.</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr><th>Mã đặt bàn</th><th>Khách</th><th>Ngày</th><th>Giờ</th><th>Số khách</th><th>Bàn</th><th>Tiền món</th><th>Trạng thái</th></tr>
          </thead>
          <tbody>
            {result.items.map((reservation) => (
              <tr key={reservation.id}>
                <td><Link href={`/bbq/${reservation.id}`}>{reservation.reservationCode}</Link></td>
                <td>{reservation.customer.fullName}</td>
                <td>{reservation.reservationDate.slice(0, 10)}</td>
                <td>{reservation.startTime}–{reservation.endTime}</td>
                <td>{reservation.adults} lớn{reservation.children > 0 ? `, ${reservation.children} trẻ` : ''}</td>
                <td>{reservation.tables.length > 0 ? reservation.tables.map((t) => t.code).join(', ') : 'Chưa gán'}</td>
                <td>{formatVnd(reservation.itemsAmount)}đ</td>
                <td><span className={`booking-status booking-status-${reservation.status.toLowerCase()}`}>{reservation.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="bookings-pagination">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Trước</button>
        <span>Trang {page}/{lastPage} · {result.total} đặt bàn</span>
        <button type="button" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>Sau →</button>
      </div>
    </>
  );
}
