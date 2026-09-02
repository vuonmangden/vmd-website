import { adminApi } from '../lib/api-client';

export interface OccupancyDay {
  date: string;
  occupiedRooms: number;
  totalRooms: number;
  occupancyRate: number;
}

export interface OpsDashboard {
  date: string;
  bookings: {
    arrivalsToday: number;
    checkedInToday: number;
    departuresToday: number;
    checkedOutToday: number;
    pendingPayment: number;
    unconfirmedArrivalsToday: number;
  };
  bbq: { reservationsToday: number };
  payments: {
    reconciliationOpen: number;
    /** Integer VND as a string — the amount can exceed Number.MAX_SAFE_INTEGER precision, same convention as every other money field in this API. */
    revenueToday: string;
    depositsCollectedTotal: string;
  };
  occupancy: OccupancyDay[];
  notifications: { failed: number };
  contact: { unhandled: number };
}

/** `date` is an operational-day label (YYYY-MM-DD, Asia/Ho_Chi_Minh) — omit for today. */
export function getOpsDashboard(date?: string): Promise<OpsDashboard> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return adminApi<OpsDashboard>(`/admin/ops/dashboard${query}`);
}
