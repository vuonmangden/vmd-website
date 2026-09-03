'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { formatVnd } from '../lib/format';
import { getBbqReservation, transitionBbqReservation } from './bbq-api';
import type { BbqReservationDetail, BbqTransition } from './bbq-api';
import { ACTION_LABELS, availableActions } from './transitions';

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; reservation: BbqReservationDetail };

const REASON_REQUIRED: readonly BbqTransition[] = ['cancel'];

export function BbqDetailView({ id }: { id: string }) {
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [actionError, setActionError] = useState<string>();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  function load(): void {
    setState({ status: 'loading' });
    getBbqReservation(id)
      .then((reservation) => setState({ status: 'ready', reservation }))
      .catch((error: unknown) => setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải đặt bàn' }));
  }

  useEffect(load, [id]);

  async function handleAction(action: BbqTransition): Promise<void> {
    if (REASON_REQUIRED.includes(action) && !reason.trim()) {
      setActionError('Cần nhập lý do');
      return;
    }
    setBusy(true);
    setActionError(undefined);
    try {
      await transitionBbqReservation(id, action, reason.trim() || undefined);
      setReason('');
      load();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Thao tác thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <BbqDetailContent
      state={state}
      actionError={actionError}
      busy={busy}
      reason={reason}
      onReasonChange={setReason}
      onAction={(action) => void handleAction(action)}
    />
  );
}

export function BbqDetailContent({ state, actionError, busy, reason, onReasonChange, onAction }: {
  state: ViewState;
  actionError?: string;
  busy: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onAction: (action: BbqTransition) => void;
}) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải đặt bàn…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  const { reservation } = state;
  const actions = availableActions(reservation.status);

  return (
    <div className="booking-detail">
      <div className="booking-detail-header">
        <div>
          <p className="booking-code">{reservation.reservationCode}</p>
          <span className={`booking-status booking-status-${reservation.status.toLowerCase()}`}>{reservation.status}</span>
        </div>
      </div>

      {actionError ? <p role="alert" className="dashboard-error">{actionError}</p> : null}

      <dl className="booking-facts">
        <div><dt>Khách</dt><dd>{reservation.customer.fullName} ({reservation.customer.customerCode})</dd></div>
        <div><dt>Ngày</dt><dd>{reservation.reservationDate.slice(0, 10)}</dd></div>
        <div><dt>Giờ</dt><dd>{reservation.startTime}–{reservation.endTime}</dd></div>
        <div><dt>Số khách</dt><dd>{reservation.adults} người lớn, {reservation.children} trẻ em</dd></div>
        <div><dt>Tiền món</dt><dd>{formatVnd(reservation.itemsAmount)}đ</dd></div>
        <div><dt>Cọc</dt><dd>{formatVnd(reservation.depositAmount)}đ</dd></div>
        <div>
          <dt>Bàn</dt>
          <dd>{reservation.tables.length > 0 ? reservation.tables.map((t) => `${t.table.name} (${t.area.name})`).join(', ') : 'Chưa gán — lễ tân sắp xếp khi khách đến'}</dd>
        </div>
        {reservation.specialRequest ? <div><dt>Yêu cầu đặc biệt</dt><dd>{reservation.specialRequest}</dd></div> : null}
      </dl>

      <h2 className="dashboard-section-title">Món đã đặt</h2>
      {reservation.items.length === 0 ? <p>Chưa đặt món trước.</p> : (
        <table className="bookings-table">
          <thead><tr><th>Món</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
          <tbody>
            {reservation.items.map((item) => (
              <tr key={item.id}><td>{item.itemName}</td><td>{item.quantity}</td><td>{formatVnd(item.unitPrice)}đ</td><td>{formatVnd(item.lineTotal)}đ</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="dashboard-section-title">Lịch sử trạng thái</h2>
      <ul className="status-history">
        {reservation.statusHistory.map((entry) => (
          <li key={entry.id}>
            <span className="status-history-transition">{entry.fromStatus ?? '—'} → {entry.toStatus}</span>
            <span className="status-history-date">{entry.changedAt.slice(0, 19).replace('T', ' ')}</span>
            {entry.reason ? <span className="status-history-reason">{entry.reason}</span> : null}
          </li>
        ))}
      </ul>

      {actions.length > 0 && (
        <div className="cancel-panel">
          <h2 className="dashboard-section-title">Thao tác</h2>
          <label>
            Lý do (bắt buộc khi hủy)
            <textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} disabled={busy} />
          </label>
          <div className="bbq-actions">
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                className={action === 'cancel' ? 'button-danger' : undefined}
                onClick={() => onAction(action)}
                disabled={busy}
              >
                {ACTION_LABELS[action]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
