'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { formatVnd } from '../lib/format';
import { cancelBooking, confirmBooking, getBooking } from './bookings-api';
import type { BookingDetail } from './bookings-api';

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; booking: BookingDetail };

export function BookingDetailView({ id }: { id: string }) {
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [actionError, setActionError] = useState<string>();
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

  function load(): void {
    setState({ status: 'loading' });
    getBooking(id)
      .then((booking) => setState({ status: 'ready', booking }))
      .catch((error: unknown) => setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải booking' }));
  }

  useEffect(load, [id]);

  async function handleConfirm(): Promise<void> {
    setBusy(true);
    setActionError(undefined);
    try {
      await confirmBooking(id);
      load();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Xác nhận thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(): Promise<void> {
    if (!cancelReason.trim()) {
      setActionError('Cần nhập lý do hủy');
      return;
    }
    setBusy(true);
    setActionError(undefined);
    try {
      await cancelBooking(id, cancelReason.trim());
      setCancelReason('');
      load();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Hủy thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <BookingDetailContent
      state={state}
      actionError={actionError}
      busy={busy}
      cancelReason={cancelReason}
      onCancelReasonChange={setCancelReason}
      onConfirm={() => void handleConfirm()}
      onCancel={() => void handleCancel()}
    />
  );
}

const TERMINAL_STATUSES = new Set(['CANCELLED', 'CHECKED_OUT', 'EXPIRED']);

export function BookingDetailContent({ state, actionError, busy, cancelReason, onCancelReasonChange, onConfirm, onCancel }: {
  state: ViewState;
  actionError?: string;
  busy: boolean;
  cancelReason: string;
  onCancelReasonChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải booking…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  const { booking } = state;
  const isTerminal = TERMINAL_STATUSES.has(booking.status);

  return (
    <div className="booking-detail">
      <div className="booking-detail-header">
        <div>
          <p className="booking-code">{booking.bookingCode}</p>
          <span className={`booking-status booking-status-${booking.status.toLowerCase()}`}>{booking.status}</span>
        </div>
        {!isTerminal && (
          <div className="booking-actions">
            <button type="button" onClick={onConfirm} disabled={busy}>Xác nhận</button>
          </div>
        )}
      </div>

      {actionError ? <p role="alert" className="dashboard-error">{actionError}</p> : null}

      <dl className="booking-facts">
        <div><dt>Khách</dt><dd>{booking.customer.fullName} ({booking.customer.customerCode})</dd></div>
        <div><dt>Nhận phòng</dt><dd>{booking.checkInDate.slice(0, 10)}</dd></div>
        <div><dt>Trả phòng</dt><dd>{booking.checkOutDate.slice(0, 10)}</dd></div>
        <div><dt>Số khách</dt><dd>{booking.adults} người lớn, {booking.children} trẻ em</dd></div>
        <div><dt>Tổng tiền</dt><dd>{formatVnd(booking.totalAmount)}đ</dd></div>
        <div><dt>Cọc yêu cầu</dt><dd>{formatVnd(booking.depositRequiredAmount)}đ ({booking.depositPolicy})</dd></div>
        <div><dt>Số lần đổi ngày</dt><dd>{booking.dateChangeCount}</dd></div>
        {booking.specialRequest ? <div><dt>Yêu cầu đặc biệt</dt><dd>{booking.specialRequest}</dd></div> : null}
      </dl>

      <h2 className="dashboard-section-title">Phòng đã đặt</h2>
      <table className="bookings-table">
        <thead><tr><th>Room ID</th><th>Người lớn</th><th>Trẻ em</th><th>Đệm thêm</th><th>Giá/đêm</th><th>Thành tiền</th></tr></thead>
        <tbody>
          {booking.rooms.map((room) => (
            <tr key={room.id}>
              <td>{room.roomId}</td><td>{room.adults}</td><td>{room.children}</td><td>{room.extraMattressQuantity}</td>
              <td>{formatVnd(room.nightlyRateSnapshot)}đ</td><td>{formatVnd(room.amount)}đ</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="dashboard-section-title">Lịch sử trạng thái</h2>
      <ul className="status-history">
        {booking.statusHistory.map((entry) => (
          <li key={entry.id}>
            <span className="status-history-transition">{entry.fromStatus ?? '—'} → {entry.toStatus}</span>
            <span className="status-history-date">{entry.changedAt.slice(0, 19).replace('T', ' ')}</span>
            {entry.reason ? <span className="status-history-reason">{entry.reason}</span> : null}
          </li>
        ))}
      </ul>

      {!isTerminal && (
        <div className="cancel-panel">
          <h2 className="dashboard-section-title">Hủy booking</h2>
          <label>
            Lý do hủy
            <textarea value={cancelReason} onChange={(event) => onCancelReasonChange(event.target.value)} disabled={busy} />
          </label>
          <button type="button" className="button-danger" onClick={onCancel} disabled={busy}>Hủy booking</button>
        </div>
      )}
    </div>
  );
}
