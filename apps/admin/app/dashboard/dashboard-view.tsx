'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { formatVnd } from '../lib/format';
import { getOpsDashboard } from './ops-api';
import type { OpsDashboard } from './ops-api';

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; dashboard: OpsDashboard };

export function DashboardView() {
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getOpsDashboard()
      .then((dashboard) => { if (!cancelled) setState({ status: 'ready', dashboard }); })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof ApiError ? error.message : 'Không thể tải dữ liệu';
        setState({ status: 'error', message });
      });
    return () => { cancelled = true; };
  }, []);

  return <DashboardContent state={state} />;
}

/** Split out from DashboardView so it can be rendered with a hand-fed state in tests, the same pattern admin-route.tsx uses for AdminRouteState — a component with a live useEffect can't be exercised by renderToStaticMarkup (effects never run during SSR), a pure one can. */
export function DashboardContent({ state }: { state: ViewState }) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải tổng quan…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  const { dashboard } = state;
  return (
    <div className="dashboard">
      <p className="dashboard-date">Ngày vận hành: {dashboard.date}</p>

      <section aria-labelledby="dashboard-bookings" className="dashboard-grid">
        <h2 id="dashboard-bookings" className="dashboard-section-title">Đặt phòng hôm nay</h2>
        <Stat label="Khách đến" value={dashboard.bookings.arrivalsToday} />
        <Stat label="Đã nhận phòng" value={dashboard.bookings.checkedInToday} />
        <Stat label="Khách trả phòng" value={dashboard.bookings.departuresToday} />
        <Stat label="Đã trả phòng" value={dashboard.bookings.checkedOutToday} />
        <Stat label="Chờ thanh toán" value={dashboard.bookings.pendingPayment} warn={dashboard.bookings.pendingPayment > 0} />
        <Stat label="Khách đến hôm nay chưa xác nhận" value={dashboard.bookings.unconfirmedArrivalsToday} warn={dashboard.bookings.unconfirmedArrivalsToday > 0} />
      </section>

      <section aria-labelledby="dashboard-bbq-payments" className="dashboard-grid">
        <h2 id="dashboard-bbq-payments" className="dashboard-section-title">BBQ &amp; thanh toán</h2>
        <Stat label="Đặt bàn BBQ hôm nay" value={dashboard.bbq.reservationsToday} />
        <Stat label="Case đối soát đang mở" value={dashboard.payments.reconciliationOpen} warn={dashboard.payments.reconciliationOpen > 0} />
        <Stat label="Doanh thu hôm nay" value={`${formatVnd(dashboard.payments.revenueToday)}đ`} />
        <Stat label="Tổng cọc đã thu" value={`${formatVnd(dashboard.payments.depositsCollectedTotal)}đ`} />
      </section>

      <section aria-labelledby="dashboard-alerts" className="dashboard-grid">
        <h2 id="dashboard-alerts" className="dashboard-section-title">Cần chú ý</h2>
        <Stat label="Thông báo gửi lỗi" value={dashboard.notifications.failed} warn={dashboard.notifications.failed > 0} />
        <Stat label="Liên hệ chưa xử lý" value={dashboard.contact.unhandled} warn={dashboard.contact.unhandled > 0} />
      </section>

      <section aria-labelledby="dashboard-occupancy">
        <h2 id="dashboard-occupancy" className="dashboard-section-title">Công suất phòng 7 ngày</h2>
        <ul className="occupancy-list">
          {dashboard.occupancy.map((day) => (
            <li key={day.date}>
              <span className="occupancy-date">{day.date}</span>
              <span className="occupancy-bar" aria-hidden="true">
                <span className="occupancy-bar-fill" style={{ width: `${day.occupancyRate}%` }} />
              </span>
              <span className="occupancy-rate">{day.occupiedRooms}/{day.totalRooms} · {day.occupancyRate}%</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className={`stat-card${warn ? ' stat-card-warn' : ''}`}>
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}
