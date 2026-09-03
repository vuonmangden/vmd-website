'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { formatVnd } from '../lib/format';
import { listPaymentIntents } from './payments-api';
import type { PaymentIntentListResult, PaymentIntentSummary } from './payments-api';

const STATUS_OPTIONS = ['', 'PENDING', 'PAID', 'PARTIALLY_PAID', 'EXPIRED', 'CANCELLED'];

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; result: PaymentIntentListResult };

export function PaymentsListView() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    listPaymentIntents({ status: statusFilter || undefined, page })
      .then((result) => { if (!cancelled) setState({ status: 'ready', result }); })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải danh sách thanh toán' });
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
      <PaymentsListContent state={state} page={page} onPageChange={setPage} />
    </div>
  );
}

export function PaymentsListContent({ state, page, onPageChange }: { state: ViewState; page: number; onPageChange: (page: number) => void }) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải danh sách thanh toán…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  const { result } = state;
  const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <>
      {result.items.length === 0 ? (
        <p>Không có giao dịch nào khớp bộ lọc.</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Mã tham chiếu</th><th>Khách</th><th>Nội dung CK</th>
              <th>Cần thu</th><th>Đã nhận</th><th>Trạng thái</th><th>Đối soát</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((intent) => <PaymentRow key={intent.id} intent={intent} />)}
          </tbody>
        </table>
      )}
      <div className="bookings-pagination">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Trước</button>
        <span>Trang {page}/{lastPage} · {result.total} giao dịch</span>
        <button type="button" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>Sau →</button>
      </div>
    </>
  );
}

function PaymentRow({ intent }: { intent: PaymentIntentSummary }) {
  /** Surfacing a shortfall/excess in the row itself saves opening every record to find the one that needs attention. */
  const difference = shortfall(intent.amount, intent.paidAmount);

  return (
    <tr>
      <td>
        {intent.referenceCode}
        <span className="payment-reference-kind">{intent.referenceType === 'BOOKING' ? 'Phòng' : 'BBQ'}</span>
      </td>
      <td>{intent.customerName}</td>
      <td><code>{intent.transferContent}</code></td>
      <td>{formatVnd(intent.amount)}đ</td>
      <td>
        {formatVnd(intent.paidAmount)}đ
        {difference !== null && <span className="payment-difference">{difference}</span>}
      </td>
      <td><span className={`booking-status booking-status-${intent.status.toLowerCase()}`}>{intent.status}</span></td>
      <td>
        {intent.openReconciliationCases.length === 0
          ? '—'
          : <span className="payment-case-flag">{intent.openReconciliationCases.map((item) => item.reason).join(', ')}</span>}
      </td>
    </tr>
  );
}

/**
 * Compares two integer-VND strings without going through Number — amounts
 * here can exceed 2^53, and a rounded comparison would quietly mislabel a
 * balanced payment as short. Returns null when they match exactly.
 */
export function shortfall(expected: string, received: string): string | null {
  if (!/^-?\d+$/.test(expected) || !/^-?\d+$/.test(received)) return null;
  const difference = BigInt(received) - BigInt(expected);
  if (difference === 0n) return null;
  return difference > 0n ? `thừa ${formatVnd(difference.toString())}đ` : `thiếu ${formatVnd((-difference).toString())}đ`;
}
