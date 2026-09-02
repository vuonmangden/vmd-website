import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BookingDetailContent } from './booking-detail-view';
import type { BookingDetail } from './bookings-api';

const BOOKING: BookingDetail = {
  id: 'b1', bookingCode: 'VMD-BK1', status: 'CONFIRMED',
  checkInDate: '2026-09-02T00:00:00.000Z', checkOutDate: '2026-09-04T00:00:00.000Z',
  originalCheckInDate: '2026-09-02T00:00:00.000Z', originalCheckOutDate: '2026-09-04T00:00:00.000Z',
  adults: 2, children: 0, totalAmount: '1200000', depositRequiredAmount: '600000', depositPolicy: 'STANDARD',
  dateChangeCount: 0, currency: 'VND', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
  specialRequest: null, expectedArrivalTime: null,
  customer: { id: 'c1', fullName: 'Nguyễn Văn A', customerCode: 'VMD-C1' },
  rooms: [{ id: 'r1', roomId: 'room-1', roomTypeId: 'rt-1', nightlyRateSnapshot: '600000', amount: '1200000', adults: 2, children: 0, extraMattressQuantity: 0, createdAt: '2026-09-01T00:00:00.000Z' }],
  statusHistory: [{ id: 'h1', fromStatus: 'PENDING_PAYMENT', toStatus: 'CONFIRMED', reason: null, changedAt: '2026-09-01T10:00:00.000Z' }],
};

const NOOP_PROPS = { busy: false, cancelReason: '', onCancelReasonChange: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn() };

describe('BookingDetailContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<BookingDetailContent state={{ status: 'loading' }} {...NOOP_PROPS} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<BookingDetailContent state={{ status: 'error', message: 'Lỗi' }} {...NOOP_PROPS} />);
    expect(markup).toContain('role="alert"');
  });

  it('renders booking facts, room lines, status history, and offers confirm/cancel for a non-terminal booking', () => {
    const markup = renderToStaticMarkup(<BookingDetailContent state={{ status: 'ready', booking: BOOKING }} {...NOOP_PROPS} />);

    expect(markup).toContain('VMD-BK1');
    expect(markup).toContain('Nguyễn Văn A');
    expect(markup).toContain('1.200.000đ');
    expect(markup).toContain('PENDING_PAYMENT → CONFIRMED');
    expect(markup).toContain('Xác nhận');
    expect(markup).toContain('Hủy booking');
  });

  it('hides confirm/cancel actions for a terminal booking status', () => {
    const markup = renderToStaticMarkup(
      <BookingDetailContent state={{ status: 'ready', booking: { ...BOOKING, status: 'CANCELLED' } }} {...NOOP_PROPS} />,
    );

    expect(markup).not.toContain('>Xác nhận<');
    expect(markup).not.toContain('Hủy booking');
  });

  it('surfaces an action error alongside the booking, not in place of it', () => {
    const markup = renderToStaticMarkup(
      <BookingDetailContent state={{ status: 'ready', booking: BOOKING }} {...NOOP_PROPS} actionError="Không có quyền xác nhận" />,
    );

    expect(markup).toContain('Không có quyền xác nhận');
    expect(markup).toContain('VMD-BK1');
  });
});
