import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BbqDetailContent } from './bbq-detail-view';
import type { BbqReservationDetail } from './bbq-api';

const RESERVATION: BbqReservationDetail = {
  id: 'r1', reservationCode: 'VMD-BBQ1', status: 'CONFIRMED',
  reservationDate: '2026-09-02T00:00:00.000Z', startTime: '18:00', endTime: '20:00',
  adults: 4, children: 0, itemsAmount: '850000', depositAmount: '0', currency: 'VND',
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', specialRequest: null,
  customer: { id: 'c1', fullName: 'Trần Thị B', customerCode: 'VMD-C2' },
  tables: [{ table: { id: 't1', code: 'SAN-DO-01', name: 'Bàn 01' }, area: { id: 'a1', code: 'SAN-DO', name: 'Sân Đỏ' }, status: 'ACTIVE', startAt: '2026-09-02T11:00:00.000Z', endAt: '2026-09-02T13:00:00.000Z' }],
  items: [{ id: 'i1', itemName: 'Set nướng 4 người', quantity: 1, unitPrice: '850000', lineTotal: '850000' }],
  statusHistory: [{ id: 'h1', fromStatus: 'PENDING_PAYMENT', toStatus: 'CONFIRMED', reason: null, changedAt: '2026-09-01T10:00:00.000Z' }],
};

const NOOP_PROPS = { busy: false, reason: '', onReasonChange: vi.fn(), onAction: vi.fn() };

describe('BbqDetailContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<BbqDetailContent state={{ status: 'loading' }} {...NOOP_PROPS} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders reservation facts, items, status history, and the actions available for CONFIRMED', () => {
    const markup = renderToStaticMarkup(<BbqDetailContent state={{ status: 'ready', reservation: RESERVATION }} {...NOOP_PROPS} />);

    expect(markup).toContain('VMD-BBQ1');
    expect(markup).toContain('Trần Thị B');
    expect(markup).toContain('Bàn 01 (Sân Đỏ)');
    expect(markup).toContain('Set nướng 4 người');
    expect(markup).toContain('PENDING_PAYMENT → CONFIRMED');
    expect(markup).toContain('Check-in');
    expect(markup).toContain('>Hủy<');
    expect(markup).not.toContain('>Xác nhận<');
  });

  it('shows a not-yet-assigned table message and the confirm/cancel actions for PENDING_CONFIRMATION', () => {
    const markup = renderToStaticMarkup(
      <BbqDetailContent state={{ status: 'ready', reservation: { ...RESERVATION, status: 'PENDING_CONFIRMATION', tables: [] } }} {...NOOP_PROPS} />,
    );

    expect(markup).toContain('Chưa gán — lễ tân sắp xếp khi khách đến');
    expect(markup).toContain('Xác nhận');
    expect(markup).toContain('>Hủy<');
  });

  it('hides the actions panel for a terminal status', () => {
    const markup = renderToStaticMarkup(
      <BbqDetailContent state={{ status: 'ready', reservation: { ...RESERVATION, status: 'CHECKED_OUT' } }} {...NOOP_PROPS} />,
    );

    expect(markup).not.toContain('Thao tác');
  });
});
