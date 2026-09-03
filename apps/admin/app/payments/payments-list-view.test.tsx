import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PaymentsListContent, shortfall } from './payments-list-view';
import type { PaymentIntentListResult } from './payments-api';

const RESULT: PaymentIntentListResult = {
  items: [
    {
      id: 'p1', bookingId: 'b1', bbqReservationId: null, referenceType: 'BOOKING', referenceCode: 'VMD-2609-01',
      customerName: 'Nguyễn Văn A', provider: 'SEPAY', status: 'PAID', amount: '2500000', paidAmount: '2500000',
      currency: 'VND', transferContent: 'VMD260901', expiresAt: '2026-09-01T10:00:00.000Z',
      createdAt: '2026-09-01T09:00:00.000Z', openReconciliationCases: [],
    },
    {
      id: 'p2', bookingId: null, bbqReservationId: 'r1', referenceType: 'BBQ_RESERVATION', referenceCode: 'VMD-BBQ2',
      customerName: 'Trần Thị B', provider: 'SEPAY', status: 'PARTIALLY_PAID', amount: '2500000', paidAmount: '2000000',
      currency: 'VND', transferContent: 'VMDBBQ2', expiresAt: '2026-09-01T10:00:00.000Z',
      createdAt: '2026-09-01T09:00:00.000Z', openReconciliationCases: [{ id: 'c1', reason: 'UNDERPAYMENT' }],
    },
  ],
  page: 1,
  pageSize: 50,
  total: 2,
};

describe('PaymentsListContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<PaymentsListContent state={{ status: 'loading' }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<PaymentsListContent state={{ status: 'error', message: 'Lỗi tải' }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Lỗi tải');
  });

  it('formats money with thousands separators and labels the reference kind', () => {
    const markup = renderToStaticMarkup(<PaymentsListContent state={{ status: 'ready', result: RESULT }} page={1} onPageChange={vi.fn()} />);

    expect(markup).toContain('2.500.000đ');
    expect(markup).toContain('VMD-2609-01');
    expect(markup).toContain('Phòng');
    expect(markup).toContain('BBQ');
  });

  it('flags a shortfall and the open reconciliation reason on the row that needs attention', () => {
    const markup = renderToStaticMarkup(<PaymentsListContent state={{ status: 'ready', result: RESULT }} page={1} onPageChange={vi.fn()} />);

    expect(markup).toContain('thiếu 500.000đ');
    expect(markup).toContain('UNDERPAYMENT');
  });

  it('shows an empty state when nothing matches the filter', () => {
    const markup = renderToStaticMarkup(<PaymentsListContent state={{ status: 'ready', result: { ...RESULT, items: [], total: 0 } }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('Không có giao dịch nào khớp bộ lọc');
  });
});

describe('shortfall', () => {
  it('returns null when the paid amount matches exactly', () => {
    expect(shortfall('2500000', '2500000')).toBeNull();
  });

  it('reports an underpayment and an overpayment in the customer-facing direction', () => {
    expect(shortfall('2500000', '2000000')).toBe('thiếu 500.000đ');
    expect(shortfall('2500000', '2600000')).toBe('thừa 100.000đ');
  });

  /**
   * Amounts are BigInt server-side precisely because they can exceed 2^53;
   * comparing via Number would round these two to the same value and report
   * a balanced payment.
   */
  it('stays exact above Number.MAX_SAFE_INTEGER', () => {
    expect(shortfall('9007199254740993', '9007199254740992')).toBe('thiếu 1đ');
    expect(shortfall('9007199254740993', '9007199254740993')).toBeNull();
  });

  it('returns null rather than throwing on a non-numeric amount', () => {
    expect(shortfall('abc', '100')).toBeNull();
  });
});
