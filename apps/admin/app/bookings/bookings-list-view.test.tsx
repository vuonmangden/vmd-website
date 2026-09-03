import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BookingsListContent } from './bookings-list-view';
import type { BookingListResult } from './bookings-api';

const RESULT: BookingListResult = {
  items: [
    { id: 'b1', bookingCode: 'VMD-BK1', status: 'CONFIRMED', checkInDate: '2026-09-02T00:00:00.000Z', checkOutDate: '2026-09-04T00:00:00.000Z', adults: 2, children: 1, totalAmount: '1200000', depositRequiredAmount: '600000', depositPolicy: 'STANDARD', dateChangeCount: 0, currency: 'VND', createdAt: '2026-09-01T00:00:00.000Z', customer: { id: 'c1', fullName: 'Nguyễn Văn A' } },
  ],
  page: 1,
  pageSize: 50,
  total: 1,
};

describe('BookingsListContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<BookingsListContent state={{ status: 'loading' }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<BookingsListContent state={{ status: 'error', message: 'Lỗi' }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('role="alert"');
  });

  it('renders each booking row with a link to its detail page and formatted VND', () => {
    const markup = renderToStaticMarkup(<BookingsListContent state={{ status: 'ready', result: RESULT }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('href="/bookings/b1"');
    expect(markup).toContain('VMD-BK1');
    expect(markup).toContain('Nguyễn Văn A');
    expect(markup).toContain('1.200.000đ');
    expect(markup).toContain('2 lớn, 1 trẻ');
  });

  it('shows an empty-state message instead of a table when there are no results', () => {
    const markup = renderToStaticMarkup(<BookingsListContent state={{ status: 'ready', result: { ...RESULT, items: [], total: 0 } }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('Không có booking nào khớp bộ lọc');
  });
});
