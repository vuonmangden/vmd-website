'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api-client';
import { formatVnd } from '../lib/format';
import {
  exportReport,
  getBbqReport,
  getBookingsReport,
  getOccupancyReport,
  getPaymentsReport,
  getRevenueReport,
} from './reports-api';
import type {
  BbqReport,
  BookingsReport,
  OccupancyReport,
  PaymentsReport,
  ReportType,
  RevenueReport,
} from './reports-api';

export type ReportState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; type: 'bookings'; report: BookingsReport }
  | { status: 'ready'; type: 'revenue'; report: RevenueReport }
  | { status: 'ready'; type: 'occupancy'; report: OccupancyReport }
  | { status: 'ready'; type: 'bbq'; report: BbqReport }
  | { status: 'ready'; type: 'payments'; report: PaymentsReport };

export const REPORT_TYPE_OPTIONS: ReadonlyArray<{ value: ReportType; label: string }> = [
  { value: 'bookings', label: 'Đặt phòng' },
  { value: 'revenue', label: 'Doanh thu' },
  { value: 'occupancy', label: 'Công suất phòng' },
  { value: 'bbq', label: 'BBQ' },
  { value: 'payments', label: 'Thanh toán' },
];

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

async function fetchReport(type: ReportType, from: string, to: string): Promise<ReportState> {
  switch (type) {
    case 'bookings':
      return { status: 'ready', type, report: await getBookingsReport(from, to) };
    case 'revenue':
      return { status: 'ready', type, report: await getRevenueReport(from, to) };
    case 'occupancy':
      return { status: 'ready', type, report: await getOccupancyReport(from, to) };
    case 'bbq':
      return { status: 'ready', type, report: await getBbqReport(from, to) };
    case 'payments':
      return { status: 'ready', type, report: await getPaymentsReport(from, to) };
  }
}

function downloadCsv(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ReportsView() {
  const initialRange = defaultRange();
  const [reportType, setReportType] = useState<ReportType>('revenue');
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [state, setState] = useState<ReportState>({ status: 'loading' });
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetchReport(reportType, from, to)
      .then((result) => { if (!cancelled) setState(result); })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải báo cáo' });
      });
    return () => { cancelled = true; };
  }, [reportType, from, to]);

  async function handleExport(): Promise<void> {
    setExportBusy(true);
    setExportError(undefined);
    try {
      const result = await exportReport(reportType, from, to);
      downloadCsv(result.filename, result.body);
    } catch (error) {
      setExportError(error instanceof ApiError ? error.message : 'Xuất báo cáo thất bại');
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <ReportsContent
      reportType={reportType}
      onReportTypeChange={setReportType}
      from={from}
      onFromChange={setFrom}
      to={to}
      onToChange={setTo}
      state={state}
      exportBusy={exportBusy}
      exportError={exportError}
      onExport={() => void handleExport()}
    />
  );
}

export function ReportsContent({
  reportType, onReportTypeChange,
  from, onFromChange,
  to, onToChange,
  state,
  exportBusy, exportError,
  onExport,
}: {
  reportType: ReportType;
  onReportTypeChange: (value: ReportType) => void;
  from: string;
  onFromChange: (value: string) => void;
  to: string;
  onToChange: (value: string) => void;
  state: ReportState;
  exportBusy: boolean;
  exportError?: string;
  onExport: () => void;
}) {
  return (
    <div className="reports-page">
      <div className="reports-toolbar">
        <label>
          Báo cáo
          <select value={reportType} onChange={(event) => onReportTypeChange(event.target.value as ReportType)}>
            {REPORT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          Từ ngày
          <input type="date" value={from} onChange={(event) => onFromChange(event.target.value)} />
        </label>
        <label>
          Đến ngày
          <input type="date" value={to} onChange={(event) => onToChange(event.target.value)} />
        </label>
        <button type="button" onClick={onExport} disabled={exportBusy || state.status !== 'ready'}>
          {exportBusy ? 'Đang xuất…' : 'Xuất CSV'}
        </button>
      </div>

      {exportError ? <p role="alert" className="dashboard-error">{exportError}</p> : null}

      <ReportBody state={state} />
    </div>
  );
}

function ReportBody({ state }: { state: ReportState }) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải báo cáo…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  if (state.type === 'bookings') return <BookingsReportBody report={state.report} />;
  if (state.type === 'revenue') return <RevenueReportBody report={state.report} />;
  if (state.type === 'occupancy') return <OccupancyReportBody report={state.report} />;
  if (state.type === 'bbq') return <BbqReportBody report={state.report} />;
  return <PaymentsReportBody report={state.report} />;
}

function BookingsReportBody({ report }: { report: BookingsReport }) {
  return (
    <div className="report-body">
      <p className="report-total">{report.total} booking</p>
      <TallyTable title="Theo trạng thái" tally={report.byStatus} />
      <TallyTable title="Theo nguồn" tally={report.bySource} />
    </div>
  );
}

function RevenueReportBody({ report }: { report: RevenueReport }) {
  return (
    <dl className="booking-facts">
      <div><dt>Doanh thu phòng</dt><dd>{formatVnd(report.roomRevenue)}đ</dd></div>
      <div><dt>Doanh thu BBQ</dt><dd>{formatVnd(report.bbqRevenue)}đ</dd></div>
      <div><dt>Tổng đã thu</dt><dd>{formatVnd(report.totalCollected)}đ</dd></div>
      <div><dt>Tổng giá trị booking</dt><dd>{formatVnd(report.totalBookingValue)}đ</dd></div>
      <div><dt>Còn phải thu</dt><dd>{formatVnd(report.outstandingBalance)}đ</dd></div>
      <div><dt>Giảm giá</dt><dd>{formatVnd(report.discount)}đ</dd></div>
    </dl>
  );
}

function OccupancyReportBody({ report }: { report: OccupancyReport }) {
  if (report.days.length === 0) return <p>Không có dữ liệu công suất phòng cho khoảng thời gian này.</p>;

  return (
    <table className="bookings-table">
      <thead><tr><th>Ngày</th><th>Phòng đã ở</th><th>Phòng khả dụng</th><th>Công suất</th></tr></thead>
      <tbody>
        {report.days.map((day) => (
          <tr key={day.date}>
            <td>{day.date}</td>
            <td>{day.occupiedRooms}</td>
            <td>{day.availableRooms}</td>
            <td>{day.occupancyRate}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BbqReportBody({ report }: { report: BbqReport }) {
  return (
    <div className="report-body">
      <p className="report-total">{report.total} lượt đặt BBQ</p>
      <dl className="booking-facts">
        <div><dt>Doanh thu món</dt><dd>{formatVnd(report.itemsRevenue)}đ</dd></div>
        <div><dt>Doanh thu cọc</dt><dd>{formatVnd(report.depositRevenue)}đ</dd></div>
      </dl>
      <TallyTable title="Theo trạng thái" tally={report.byStatus} />
    </div>
  );
}

function PaymentsReportBody({ report }: { report: PaymentsReport }) {
  return (
    <div className="report-body">
      <TallyTable title="Thanh toán theo trạng thái" tally={report.paymentsByStatus} />
      <TallyTable title="Đối soát theo trạng thái" tally={report.reconciliationByStatus} />
      <TallyTable title="Đối soát theo lý do" tally={report.reconciliationByReason} />
    </div>
  );
}

function TallyTable({ title, tally }: { title: string; tally: Record<string, number> }) {
  const entries = Object.entries(tally);
  return (
    <section>
      <h2 className="dashboard-section-title">{title}</h2>
      {entries.length === 0 ? <p>Không có dữ liệu.</p> : (
        <table className="bookings-table">
          <thead><tr><th>Loại</th><th>Số lượng</th></tr></thead>
          <tbody>
            {entries.map(([key, count]) => <tr key={key}><td>{key}</td><td>{count}</td></tr>)}
          </tbody>
        </table>
      )}
    </section>
  );
}
