import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BbqListContent } from './bbq-list-view';
import type { BbqReservationListResult } from './bbq-api';

const RESULT: BbqReservationListResult = {
  items: [
    { id: 'r1', reservationCode: 'VMD-BBQ1', status: 'CONFIRMED', reservationDate: '2026-09-02T00:00:00.000Z', startTime: '18:00', endTime: '20:00', adults: 4, children: 0, itemsAmount: '850000', depositAmount: '0', currency: 'VND', createdAt: '2026-09-01T00:00:00.000Z', customer: { id: 'c1', fullName: 'Trần Thị B' }, tables: [{ code: 'SAN-DO-01', name: 'Bàn 01' }] },
    { id: 'r2', reservationCode: 'VMD-BBQ2', status: 'PENDING_CONFIRMATION', reservationDate: '2026-09-02T00:00:00.000Z', startTime: '11:00', endTime: '13:00', adults: 10, children: 2, itemsAmount: '0', depositAmount: '0', currency: 'VND', createdAt: '2026-09-01T00:00:00.000Z', customer: { id: 'c2', fullName: 'Lê Văn C' }, tables: [] },
  ],
  page: 1,
  pageSize: 50,
  total: 2,
};

describe('BbqListContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<BbqListContent state={{ status: 'loading' }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<BbqListContent state={{ status: 'error', message: 'Lỗi' }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('role="alert"');
  });

  it('renders a row per reservation, with the assigned table or a not-yet-assigned marker', () => {
    const markup = renderToStaticMarkup(<BbqListContent state={{ status: 'ready', result: RESULT }} page={1} onPageChange={vi.fn()} />);

    expect(markup).toContain('href="/bbq/r1"');
    expect(markup).toContain('SAN-DO-01');
    expect(markup).toContain('Chưa gán');
    expect(markup).toContain('10 lớn, 2 trẻ');
  });

  it('shows an empty-state message when there are no reservations', () => {
    const markup = renderToStaticMarkup(<BbqListContent state={{ status: 'ready', result: { ...RESULT, items: [], total: 0 } }} page={1} onPageChange={vi.fn()} />);
    expect(markup).toContain('Không có đặt bàn nào khớp bộ lọc');
  });
});
