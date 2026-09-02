import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ReportsContent } from './reports-view';
import type { BbqReport, BookingsReport, OccupancyReport, PaymentsReport, RevenueReport } from './reports-api';

const NOOP_PROPS = {
  reportType: 'revenue' as const, onReportTypeChange: vi.fn(),
  from: '2026-08-01', onFromChange: vi.fn(),
  to: '2026-08-31', onToChange: vi.fn(),
  exportBusy: false,
  onExport: vi.fn(),
};

describe('ReportsContent', () => {
  it('renders an accessible loading state', () => {
    const markup = renderToStaticMarkup(<ReportsContent {...NOOP_PROPS} state={{ status: 'loading' }} />);
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders the error message as an alert', () => {
    const markup = renderToStaticMarkup(<ReportsContent {...NOOP_PROPS} state={{ status: 'error', message: 'Lỗi' }} />);
    expect(markup).toContain('role="alert"');
  });

  it('disables the export button while a report is not ready', () => {
    const markup = renderToStaticMarkup(<ReportsContent {...NOOP_PROPS} state={{ status: 'loading' }} />);
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Xuất CSV<\/button>/);
  });

  it('renders the bookings report totals and breakdowns', () => {
    const report: BookingsReport = { from: '2026-08-01', to: '2026-08-31', total: 12, byStatus: { CONFIRMED: 10, CANCELLED: 2 }, bySource: { DIRECT: 12 } };
    const markup = renderToStaticMarkup(<ReportsContent {...NOOP_PROPS} reportType="bookings" state={{ status: 'ready', type: 'bookings', report }} />);
    expect(markup).toContain('12 booking');
    expect(markup).toContain('CONFIRMED');
    expect(markup).toContain('DIRECT');
  });

  it('renders the revenue report as formatted currency', () => {
    const report: RevenueReport = { from: '2026-08-01', to: '2026-08-31', roomRevenue: '5000000', bbqRevenue: '1000000', totalCollected: '6000000', totalBookingValue: '7000000', outstandingBalance: '1000000', discount: '0' };
    const markup = renderToStaticMarkup(<ReportsContent {...NOOP_PROPS} reportType="revenue" state={{ status: 'ready', type: 'revenue', report }} />);
    expect(markup).toContain('5.000.000đ');
    expect(markup).toContain('6.000.000đ');
  });

  it('renders the occupancy report as a daily table', () => {
    const report: OccupancyReport = { from: '2026-08-01', to: '2026-08-02', days: [{ date: '2026-08-01', occupiedRooms: 3, availableRooms: 5, occupancyRate: 60 }] };
    const markup = renderToStaticMarkup(<ReportsContent {...NOOP_PROPS} reportType="occupancy" state={{ status: 'ready', type: 'occupancy', report }} />);
    expect(markup).toContain('2026-08-01');
    expect(markup).toContain('60%');
  });

  it('renders an empty-state message for an occupancy report with no days', () => {
    const report: OccupancyReport = { from: '2026-08-01', to: '2026-08-01', days: [] };
    const markup = renderToStaticMarkup(<ReportsContent {...NOOP_PROPS} reportType="occupancy" state={{ status: 'ready', type: 'occupancy', report }} />);
    expect(markup).toContain('Không có dữ liệu công suất phòng');
  });

  it('renders the bbq report totals, revenue, and status breakdown', () => {
    const report: BbqReport = { from: '2026-08-01', to: '2026-08-31', total: 4, byStatus: { CONFIRMED: 4 }, itemsRevenue: '2000000', depositRevenue: '400000' };
    const markup = renderToStaticMarkup(<ReportsContent {...NOOP_PROPS} reportType="bbq" state={{ status: 'ready', type: 'bbq', report }} />);
    expect(markup).toContain('4 lượt đặt BBQ');
    expect(markup).toContain('2.000.000đ');
  });

  it('renders the payments report with three breakdown tables', () => {
    const report: PaymentsReport = {
      from: '2026-08-01', to: '2026-08-31',
      paymentsByStatus: { PAID: 8 }, reconciliationByStatus: { OPEN: 1 }, reconciliationByReason: { AMOUNT_MISMATCH: 1 },
    };
    const markup = renderToStaticMarkup(<ReportsContent {...NOOP_PROPS} reportType="payments" state={{ status: 'ready', type: 'payments', report }} />);
    expect(markup).toContain('Thanh toán theo trạng thái');
    expect(markup).toContain('PAID');
    expect(markup).toContain('AMOUNT_MISMATCH');
  });

  it('surfaces an export error alongside the report, not in place of it', () => {
    const report: RevenueReport = { from: '2026-08-01', to: '2026-08-31', roomRevenue: '0', bbqRevenue: '0', totalCollected: '0', totalBookingValue: '0', outstandingBalance: '0', discount: '0' };
    const markup = renderToStaticMarkup(
      <ReportsContent {...NOOP_PROPS} reportType="revenue" state={{ status: 'ready', type: 'revenue', report }} exportError="Không có quyền" />,
    );
    expect(markup).toContain('Không có quyền');
    expect(markup).toContain('Doanh thu phòng');
  });
});
