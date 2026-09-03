import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ReconciliationContent } from './reconciliation-view';
import type { ReconciliationCase } from './payments-api';

function fakeCase(overrides: Partial<ReconciliationCase> = {}): ReconciliationCase {
  return {
    id: 'case-1',
    paymentIntentId: 'intent-1',
    status: 'OPEN',
    reason: 'UNDERPAYMENT',
    expectedAmount: '2500000',
    receivedAmount: '2000000',
    createdAt: '2026-09-01T09:00:00.000Z',
    resolvedAt: null,
    resolvedBy: null,
    resolutionOutcome: null,
    resolutionNote: null,
    paymentIntent: {
      id: 'intent-1', bookingId: 'b1', bbqReservationId: null, amount: '2500000',
      currency: 'VND', status: 'PARTIALLY_PAID', expiresAt: '2026-09-01T10:00:00.000Z', transferContent: 'VMD260901',
    },
    ...overrides,
  };
}

describe('ReconciliationContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<ReconciliationContent state={{ status: 'loading' }} onResolved={vi.fn()} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<ReconciliationContent state={{ status: 'error', message: 'Lỗi tải' }} onResolved={vi.fn()} />);
    expect(markup).toContain('role="alert"');
  });

  it('shows an empty state when nothing needs reconciling', () => {
    const markup = renderToStaticMarkup(<ReconciliationContent state={{ status: 'ready', cases: [] }} onResolved={vi.fn()} />);
    expect(markup).toContain('Không có trường hợp nào cần đối soát');
  });

  it('translates the reason code and shows the exact shortfall', () => {
    const markup = renderToStaticMarkup(<ReconciliationContent state={{ status: 'ready', cases: [fakeCase()] }} onResolved={vi.fn()} />);

    expect(markup).toContain('Khách chuyển thiếu');
    expect(markup).toContain('thiếu 500.000đ');
    expect(markup).toContain('2.500.000đ');
    expect(markup).toContain('VMD260901');
  });

  /**
   * The API records the decision without moving money or touching the
   * booking. If the UI does not say so, staff can reasonably assume closing
   * the case sent the refund.
   */
  it('states plainly that resolving does not refund or change the booking', () => {
    const markup = renderToStaticMarkup(<ReconciliationContent state={{ status: 'ready', cases: [fakeCase()] }} onResolved={vi.fn()} />);
    expect(markup).toContain('không');
    expect(markup).toContain('tự hoàn tiền hay đổi trạng thái đặt chỗ');
  });

  it('offers the resolve form only while the case is open', () => {
    const open = renderToStaticMarkup(<ReconciliationContent state={{ status: 'ready', cases: [fakeCase()] }} onResolved={vi.fn()} />);
    expect(open).toContain('Lưu kết quả xử lý');

    const resolved = renderToStaticMarkup(
      <ReconciliationContent
        state={{ status: 'ready', cases: [fakeCase({ status: 'RESOLVED', resolutionOutcome: 'REFUNDED', resolutionNote: 'Đã chuyển trả 500.000đ' })] }}
        onResolved={vi.fn()}
      />,
    );
    expect(resolved).not.toContain('Lưu kết quả xử lý');
    expect(resolved).toContain('Đã hoàn tiền');
    expect(resolved).toContain('Đã chuyển trả 500.000đ');
  });

  it('falls back to the raw reason code for a reason it has no translation for', () => {
    const markup = renderToStaticMarkup(
      <ReconciliationContent state={{ status: 'ready', cases: [fakeCase({ reason: 'SOME_NEW_REASON' })] }} onResolved={vi.fn()} />,
    );
    expect(markup).toContain('SOME_NEW_REASON');
  });
});
