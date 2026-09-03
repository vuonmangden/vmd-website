import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CalendarContent } from './calendar-view';
import type { CalendarRange } from './calendar-api';

const RANGE: CalendarRange = {
  from: '2026-09-02',
  to: '2026-09-04',
  rooms: [
    { id: 'room-1', code: '201', name: 'Double Lake Window', roomTypeId: 'rt-1', areaZone: 'Tầng 2', status: 'ACTIVE' },
  ],
  bookings: [
    { id: 'b1', bookingCode: 'VMD-BK1', status: 'CONFIRMED', checkInDate: '2026-09-02T00:00:00.000Z', checkOutDate: '2026-09-03T00:00:00.000Z', customerName: 'Khách A', roomIds: ['room-1'] },
  ],
  roomBlocks: [],
  bbqReservations: [
    { id: 'r1', reservationCode: 'VMD-BBQ1', status: 'CONFIRMED', reservationDate: '2026-09-02T00:00:00.000Z', startTime: '18:00', endTime: '20:00', tableIds: ['t1'] },
  ],
};

describe('CalendarContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<CalendarContent state={{ status: 'loading' }} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<CalendarContent state={{ status: 'error', message: 'Lỗi tải lịch' }} />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Lỗi tải lịch');
  });

  it('renders a grid cell per room per date, and lists BBQ reservations in range', () => {
    const markup = renderToStaticMarkup(<CalendarContent state={{ status: 'ready', range: RANGE }} />);

    expect(markup).toContain('Double Lake Window (201)');
    expect(markup).toContain('VMD-BK1');
    expect(markup).toContain('calendar-cell-confirmed');
    expect(markup).toContain('VMD-BBQ1');
    expect(markup).toContain('18:00');
  });

  it('shows an empty-state message when there are no BBQ reservations in range', () => {
    const markup = renderToStaticMarkup(<CalendarContent state={{ status: 'ready', range: { ...RANGE, bbqReservations: [] } }} />);
    expect(markup).toContain('Không có đặt bàn BBQ nào');
  });
});
