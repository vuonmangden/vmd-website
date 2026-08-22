import type { ReportsService } from './reports.service';

export const REPORT_EXPORT_TYPES = ['bookings', 'revenue', 'occupancy', 'bbq', 'payments'] as const;
export type ReportExportType = (typeof REPORT_EXPORT_TYPES)[number];

type BookingsReport = Awaited<ReturnType<ReportsService['bookings']>>;
type RevenueReport = Awaited<ReturnType<ReportsService['revenue']>>;
type OccupancyReport = Awaited<ReturnType<ReportsService['occupancy']>>;
type BbqReport = Awaited<ReturnType<ReportsService['bbq']>>;
type PaymentsReport = Awaited<ReturnType<ReportsService['payments']>>;

/**
 * Any cell starting with one of these characters can be interpreted as a
 * formula by a spreadsheet application (Excel, Google Sheets, LibreOffice)
 * when the CSV is opened — a well-known CSV-injection vector. Prefixing with
 * a single quote forces the cell to be read as literal text.
 */
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

function escapeCsvCell(value: string): string {
  let cell = FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value;
  if (/["\r\n,]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function reportRows(type: ReportExportType, report: unknown): string[][] {
  switch (type) {
    case 'bookings':
      return bookingsRows(report as BookingsReport);
    case 'revenue':
      return revenueRows(report as RevenueReport);
    case 'occupancy':
      return occupancyRows(report as OccupancyReport);
    case 'bbq':
      return bbqRows(report as BbqReport);
    case 'payments':
      return paymentsRows(report as PaymentsReport);
  }
}

function bookingsRows(report: BookingsReport): string[][] {
  const rows: string[][] = [['dimension', 'key', 'count']];
  for (const [key, count] of Object.entries(report.byStatus)) rows.push(['status', key, String(count)]);
  for (const [key, count] of Object.entries(report.bySource)) rows.push(['source', key, String(count)]);
  return rows;
}

function revenueRows(report: RevenueReport): string[][] {
  return [
    ['metric', 'value'],
    ['roomRevenue', report.roomRevenue],
    ['bbqRevenue', report.bbqRevenue],
    ['totalCollected', report.totalCollected],
    ['totalBookingValue', report.totalBookingValue],
    ['outstandingBalance', report.outstandingBalance],
    ['discount', report.discount],
  ];
}

function occupancyRows(report: OccupancyReport): string[][] {
  const rows: string[][] = [['date', 'occupiedRooms', 'availableRooms', 'occupancyRate']];
  for (const day of report.days) {
    rows.push([day.date, String(day.occupiedRooms), String(day.availableRooms), String(day.occupancyRate)]);
  }
  return rows;
}

function bbqRows(report: BbqReport): string[][] {
  const rows: string[][] = [['dimension', 'key', 'value']];
  rows.push(['total', 'total', String(report.total)]);
  for (const [key, count] of Object.entries(report.byStatus)) rows.push(['status', key, String(count)]);
  rows.push(['itemsRevenue', 'itemsRevenue', report.itemsRevenue]);
  rows.push(['depositRevenue', 'depositRevenue', report.depositRevenue]);
  return rows;
}

function paymentsRows(report: PaymentsReport): string[][] {
  const rows: string[][] = [['dimension', 'key', 'count']];
  for (const [key, count] of Object.entries(report.paymentsByStatus)) rows.push(['paymentStatus', key, String(count)]);
  for (const [key, count] of Object.entries(report.reconciliationByStatus)) rows.push(['reconciliationStatus', key, String(count)]);
  for (const [key, count] of Object.entries(report.reconciliationByReason)) rows.push(['reconciliationReason', key, String(count)]);
  return rows;
}
