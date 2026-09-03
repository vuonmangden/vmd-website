import { adminApi } from '../lib/api-client';

export type ReportType = 'bookings' | 'revenue' | 'occupancy' | 'bbq' | 'payments';

export interface BookingsReport {
  from: string;
  to: string;
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

export interface RevenueReport {
  from: string;
  to: string;
  roomRevenue: string;
  bbqRevenue: string;
  totalCollected: string;
  totalBookingValue: string;
  outstandingBalance: string;
  discount: string;
}

export interface OccupancyDay {
  date: string;
  occupiedRooms: number;
  availableRooms: number;
  occupancyRate: number;
}

export interface OccupancyReport {
  from: string;
  to: string;
  days: OccupancyDay[];
}

export interface BbqReport {
  from: string;
  to: string;
  total: number;
  byStatus: Record<string, number>;
  itemsRevenue: string;
  depositRevenue: string;
}

export interface PaymentsReport {
  from: string;
  to: string;
  paymentsByStatus: Record<string, number>;
  reconciliationByStatus: Record<string, number>;
  reconciliationByReason: Record<string, number>;
}

export interface ReportExportResult {
  filename: string;
  contentType: string;
  rowCount: number;
  body: string;
}

function reportUrl(path: string, from: string, to: string): string {
  const params = new URLSearchParams({ from, to });
  return `/admin/reports/${path}?${params.toString()}`;
}

export function getBookingsReport(from: string, to: string): Promise<BookingsReport> {
  return adminApi<BookingsReport>(reportUrl('bookings', from, to));
}

export function getRevenueReport(from: string, to: string): Promise<RevenueReport> {
  return adminApi<RevenueReport>(reportUrl('revenue', from, to));
}

export function getOccupancyReport(from: string, to: string): Promise<OccupancyReport> {
  return adminApi<OccupancyReport>(reportUrl('occupancy', from, to));
}

export function getBbqReport(from: string, to: string): Promise<BbqReport> {
  return adminApi<BbqReport>(reportUrl('bbq', from, to));
}

export function getPaymentsReport(from: string, to: string): Promise<PaymentsReport> {
  return adminApi<PaymentsReport>(reportUrl('payments', from, to));
}

export function exportReport(type: ReportType, from: string, to: string): Promise<ReportExportResult> {
  const params = new URLSearchParams({ type, from, to });
  return adminApi<ReportExportResult>(`/admin/reports/export?${params.toString()}`);
}
