import type { CalendarBooking, CalendarRoomBlock } from './calendar-api';

export type CellStatus = 'free' | 'confirmed' | 'checked_in' | 'pending_payment' | 'cancelled' | 'blocked';

export interface OccupancyCell {
  status: CellStatus;
  label: string;
}

const CANCELLED_LIKE = new Set(['CANCELLED', 'EXPIRED']);
const CHECKED_LIKE = new Set(['CHECKED_IN', 'CHECKED_OUT']);
const PENDING_LIKE = new Set(['DRAFT', 'PENDING_PAYMENT']);

/** Every date from `from` up to (excluding) `to`, both YYYY-MM-DD, matching the API's own exclusive-upper-bound range. */
export function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cursor.getTime() < end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
}

export function addDays(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * One room-block or booking can't both occupy a room on the same date in
 * practice (booking creation checks room blocks first), but if data ever
 * disagreed, a block always wins — a room taken out of service is not
 * bookable regardless of what a stale booking row says.
 */
export function cellFor(roomId: string, date: string, bookings: readonly CalendarBooking[], roomBlocks: readonly CalendarRoomBlock[]): OccupancyCell {
  const block = roomBlocks.find((candidate) => candidate.roomId === roomId && isWithin(date, candidate.startDate, candidate.endDate));
  if (block) return { status: 'blocked', label: block.reason?.trim() || 'Bảo trì' };

  const booking = bookings.find((candidate) => candidate.roomIds.includes(roomId) && isWithin(date, candidate.checkInDate, candidate.checkOutDate));
  if (!booking) return { status: 'free', label: '' };

  return { status: statusFor(booking.status), label: booking.bookingCode };
}

function statusFor(bookingStatus: string): CellStatus {
  if (CANCELLED_LIKE.has(bookingStatus)) return 'cancelled';
  if (CHECKED_LIKE.has(bookingStatus)) return 'checked_in';
  if (PENDING_LIKE.has(bookingStatus)) return 'pending_payment';
  return 'confirmed';
}

/** `date < end` because checkOutDate/endDate are exclusive — the checkout/block-end day itself is free again. */
function isWithin(date: string, startIso: string, endIsoExclusive: string): boolean {
  return date >= startIso.slice(0, 10) && date < endIsoExclusive.slice(0, 10);
}
