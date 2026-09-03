import { adminApi } from '../lib/api-client';

export interface BbqTableRef {
  code: string;
  name: string;
}

export interface BbqReservationSummary {
  id: string;
  reservationCode: string;
  status: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  adults: number;
  children: number;
  itemsAmount: string;
  depositAmount: string;
  currency: string;
  createdAt: string;
  customer: { id: string; fullName: string };
  tables: BbqTableRef[];
}

export interface BbqReservationListResult {
  items: BbqReservationSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface BbqReservationItemLine {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface BbqReservationStatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedAt: string;
}

export interface BbqReservationDetail extends Omit<BbqReservationSummary, 'customer' | 'tables'> {
  specialRequest: string | null;
  updatedAt: string;
  customer: { id: string; fullName: string; customerCode: string };
  /** Empty for a group (5-20 guest) reservation still PENDING_CONFIRMATION — BBQ-007's staff-confirms-on-arrival model doesn't pre-assign a table, and the admin confirm action doesn't take one either. */
  tables: Array<{ table: { id: string; code: string; name: string }; area: { id: string; code: string; name: string }; status: string; startAt: string; endAt: string }>;
  items: BbqReservationItemLine[];
  statusHistory: BbqReservationStatusHistoryEntry[];
}

export interface BbqReservationListFilters {
  status?: string;
  page?: number;
}

const PAGE_SIZE = 50;

export function listBbqReservations(filters: BbqReservationListFilters): Promise<BbqReservationListResult> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(PAGE_SIZE));
  return adminApi<BbqReservationListResult>(`/admin/bbq/reservations?${params.toString()}`);
}

export function getBbqReservation(id: string): Promise<BbqReservationDetail> {
  return adminApi<BbqReservationDetail>(`/admin/bbq/reservations/${encodeURIComponent(id)}`);
}

export type BbqTransition = 'confirm' | 'cancel' | 'check-in' | 'check-out';

export function transitionBbqReservation(id: string, action: BbqTransition, reason?: string): Promise<BbqReservationDetail> {
  return adminApi<BbqReservationDetail>(`/admin/bbq/reservations/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}
