'use client';

import { useEffect, useState } from 'react';
import { useCurrentActor } from '../admin-route';
import { ApiError } from '../lib/api-client';
import { formatVnd } from '../lib/format';
import { listReconciliationCases, resolveReconciliationCase, RECONCILIATION_OUTCOMES } from './payments-api';
import type { ReconciliationCase, ReconciliationOutcome } from './payments-api';
import { shortfall } from './payments-list-view';

const REASON_LABELS: Record<string, string> = {
  UNDERPAYMENT: 'Khách chuyển thiếu',
  OVERPAYMENT: 'Khách chuyển thừa',
  PAYMENT_AFTER_INTENT_EXPIRY: 'Chuyển sau khi hết hạn giữ chỗ',
};

const OUTCOME_LABELS: Record<ReconciliationOutcome, string> = {
  REFUNDED: 'Đã hoàn tiền',
  RESTORED: 'Đã khôi phục đặt chỗ',
  OTHER: 'Khác',
};

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; cases: ReconciliationCase[] };

/**
 * The page itself is gated on `payment.read`; the reconciliation API needs
 * `payment.reconcile` on top of that. Checking the already-resolved actor
 * here (rather than nesting another AdminRoute) avoids a second session
 * round-trip and keeps the rest of the page rendered for staff who can view
 * payments but not resolve cases.
 */
export function ReconciliationSection() {
  const actor = useCurrentActor();
  if (!actor.permissions.includes('payment.reconcile')) return null;

  return (
    <section aria-labelledby="reconciliation-heading">
      <h2 id="reconciliation-heading">Đối soát</h2>
      <ReconciliationView />
    </section>
  );
}

export function ReconciliationView() {
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'RESOLVED'>('OPEN');
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    listReconciliationCases({ status: statusFilter })
      .then((cases) => { if (!cancelled) setState({ status: 'ready', cases }); })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải danh sách đối soát' });
      });
    return () => { cancelled = true; };
  }, [statusFilter, reloadToken]);

  return (
    <div className="bookings-page">
      <div className="bookings-toolbar">
        <label>
          Trạng thái
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'OPEN' | 'RESOLVED')}>
            <option value="OPEN">Chờ xử lý</option>
            <option value="RESOLVED">Đã xử lý</option>
          </select>
        </label>
      </div>
      <ReconciliationContent state={state} onResolved={() => setReloadToken((token) => token + 1)} />
    </div>
  );
}

export function ReconciliationContent({ state, onResolved }: { state: ViewState; onResolved: () => void }) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải danh sách đối soát…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;
  if (state.cases.length === 0) return <p>Không có trường hợp nào cần đối soát.</p>;

  return (
    <ul className="reconciliation-list">
      {state.cases.map((item) => <ReconciliationCard key={item.id} item={item} onResolved={onResolved} />)}
    </ul>
  );
}

export function ReconciliationCard({ item, onResolved }: { item: ReconciliationCase; onResolved: () => void }) {
  const [outcome, setOutcome] = useState<ReconciliationOutcome>('REFUNDED');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const difference = shortfall(item.expectedAmount, item.receivedAmount);

  async function handleResolve(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!note.trim()) {
      setError('Cần ghi lý do xử lý để lưu vào nhật ký kiểm toán.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resolveReconciliationCase(item.id, outcome, note.trim());
      onResolved();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Không thể lưu kết quả xử lý');
      setSubmitting(false);
    }
  }

  return (
    <li className="reconciliation-card">
      <div className="reconciliation-head">
        <span className="reconciliation-reason">{REASON_LABELS[item.reason] ?? item.reason}</span>
        {difference && <span className="payment-difference">{difference}</span>}
      </div>

      <dl className="reconciliation-facts">
        <div><dt>Cần thu</dt><dd>{formatVnd(item.expectedAmount)}đ</dd></div>
        <div><dt>Đã nhận</dt><dd>{formatVnd(item.receivedAmount)}đ</dd></div>
        {item.paymentIntent && <div><dt>Nội dung CK</dt><dd><code>{item.paymentIntent.transferContent}</code></dd></div>}
      </dl>

      {item.status === 'RESOLVED' ? (
        <p className="reconciliation-resolved">
          {OUTCOME_LABELS[item.resolutionOutcome as ReconciliationOutcome] ?? item.resolutionOutcome}
          {item.resolutionNote ? ` — ${item.resolutionNote}` : ''}
        </p>
      ) : (
        <form onSubmit={handleResolve} className="reconciliation-form">
          {/*
            The API records the decision only: it moves no money and changes no
            booking. Saying so here keeps staff from assuming the refund has
            been sent just because the case closed.
          */}
          <p className="reconciliation-hint">
            Ghi nhận quyết định xử lý. Hệ thống <strong>không</strong> tự hoàn tiền hay đổi trạng thái đặt chỗ —
            hãy thực hiện việc đó trước, rồi ghi lại ở đây.
          </p>
          <label>
            Kết quả
            <select value={outcome} onChange={(event) => setOutcome(event.target.value as ReconciliationOutcome)} disabled={submitting}>
              {RECONCILIATION_OUTCOMES.map((value) => <option key={value} value={value}>{OUTCOME_LABELS[value]}</option>)}
            </select>
          </label>
          <label>
            Lý do / ghi chú
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={2000}
              rows={2}
              disabled={submitting}
              placeholder="Ví dụ: đã chuyển trả 200.000đ về STK khách lúc 14:30"
            />
          </label>
          {error && <p role="alert" className="dashboard-error">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? 'Đang lưu…' : 'Lưu kết quả xử lý'}</button>
        </form>
      )}
    </li>
  );
}
