import { adminApi } from '../lib/api-client';

export interface BookingSummary {
  id: string;
  bookingCode: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  totalAmount: string;
  depositRequiredAmount: string;
  depositPolicy: string;
  dateChangeCount: number;
  currency: string;
  createdAt: string;
  customer: { id: string; fullName: string };
}

export interface BookingListResult {
  items: BookingSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface BookingRoomLine {
  id: string;
  roomId: string;
  roomTypeId: string;
  nightlyRateSnapshot: string;
  amount: string;
  adults: number;
  children: number;
  extraMattressQuantity: number;
  createdAt: string;
}

export interface BookingStatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedAt: string;
}

export interface BookingDetail extends Omit<BookingSummary, 'customer'> {
  originalCheckInDate: string;
  originalCheckOutDate: string;
  specialRequest: string | null;
  expectedArrivalTime: string | null;
  updatedAt: string;
  customer: { id: string; fullName: string; customerCode: string };
  rooms: BookingRoomLine[];
  statusHistory: BookingStatusHistoryEntry[];
}

export interface BookingListFilters {
  status?: string;
  checkInFrom?: string;
  checkInTo?: string;
  page?: number;
}

const PAGE_SIZE = 50;

export function listBookings(filters: BookingListFilters): Promise<BookingListResult> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.checkInFrom) params.set('checkInFrom', filters.checkInFrom);
  if (filters.checkInTo) params.set('checkInTo', filters.checkInTo);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(PAGE_SIZE));
  return adminApi<BookingListResult>(`/admin/bookings?${params.toString()}`);
}

export function getBooking(id: string): Promise<BookingDetail> {
  return adminApi<BookingDetail>(`/admin/bookings/${encodeURIComponent(id)}`);
}

export function confirmBooking(id: string, reason?: string): Promise<BookingDetail> {
  return adminApi<BookingDetail>(`/admin/bookings/${encodeURIComponent(id)}/confirm`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export function cancelBooking(id: string, reason: string): Promise<BookingDetail> {
  return adminApi<BookingDetail>(`/admin/bookings/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
