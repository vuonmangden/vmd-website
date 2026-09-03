import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DashboardContent } from './dashboard-view';
import type { OpsDashboard } from './ops-api';

const DASHBOARD: OpsDashboard = {
  date: '2026-09-02',
  bookings: { arrivalsToday: 3, checkedInToday: 1, departuresToday: 2, checkedOutToday: 2, pendingPayment: 1, unconfirmedArrivalsToday: 0 },
  bbq: { reservationsToday: 4 },
  payments: { reconciliationOpen: 0, revenueToday: '1200000', depositsCollectedTotal: '5400000' },
  occupancy: [{ date: '2026-09-02', occupiedRooms: 5, totalRooms: 7, occupancyRate: 71.43 }],
  notifications: { failed: 0 },
  contact: { unhandled: 2 },
};

describe('DashboardContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<DashboardContent state={{ status: 'loading' }} />);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('role="status"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<DashboardContent state={{ status: 'error', message: 'Không thể tải' }} />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Không thể tải');
  });

  it('renders the counters and formats VND revenue with thousands separators', () => {
    const markup = renderToStaticMarkup(<DashboardContent state={{ status: 'ready', dashboard: DASHBOARD }} />);
    expect(markup).toContain('2026-09-02');
    expect(markup).toContain('1.200.000đ');
    expect(markup).toContain('5.400.000đ');
    expect(markup).toContain('5/7');
  });

  it('flags pending-payment and unhandled-contact counters when they are above zero', () => {
    const markup = renderToStaticMarkup(<DashboardContent state={{ status: 'ready', dashboard: DASHBOARD }} />);
    expect(markup).toContain('stat-card-warn');
  });
});
