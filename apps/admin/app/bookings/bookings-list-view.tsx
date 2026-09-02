'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { formatVnd } from '../lib/format';
import { listBookings } from './bookings-api';
import type { BookingListResult } from './bookings-api';

const STATUS_OPTIONS = ['', 'DRAFT', 'PENDING_PAYMENT', 'CONFIRMED', 'MODIFIED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'EXPIRED'];

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; result: BookingListResult };

export function BookingsListView() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    listBookings({ status: statusFilter || undefined, page })
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
      <BookingsListContent state={state} page={page} onPageChange={setPage} />
    </div>
  );
}

export function BookingsListContent({ state, page, onPageChange }: { state: ViewState; page: number; onPageChange: (page: number) => void }) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải danh sách…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  const { result } = state;
  const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <>
      {result.items.length === 0 ? (
        <p>Không có booking nào khớp bộ lọc.</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Mã booking</th><th>Khách</th><th>Nhận phòng</th><th>Trả phòng</th><th>Khách</th><th>Tổng tiền</th><th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((booking) => (
              <tr key={booking.id}>
                <td><Link href={`/bookings/${booking.id}`}>{booking.bookingCode}</Link></td>
                <td>{booking.customer.fullName}</td>
                <td>{booking.checkInDate.slice(0, 10)}</td>
                <td>{booking.checkOutDate.slice(0, 10)}</td>
                <td>{booking.adults} lớn{booking.children > 0 ? `, ${booking.children} trẻ` : ''}</td>
                <td>{formatVnd(booking.totalAmount)}đ</td>
                <td><span className={`booking-status booking-status-${booking.status.toLowerCase()}`}>{booking.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="bookings-pagination">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Trước</button>
        <span>Trang {page}/{lastPage} · {result.total} booking</span>
        <button type="button" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>Sau →</button>
      </div>
    </>
  );
}
