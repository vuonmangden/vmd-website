import { adminApi } from '../lib/api-client';

export interface CalendarRoom {
  id: string;
  code: string;
  name: string;
  roomTypeId: string;
  areaZone: string | null;
  status: string;
}

export interface CalendarBooking {
  id: string;
  bookingCode: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  customerName: string;
  roomIds: string[];
}

export interface CalendarRoomBlock {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  blockType: string;
}

export interface CalendarBbqReservation {
  id: string;
  reservationCode: string;
  status: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  tableIds: string[];
}

export interface CalendarRange {
  from: string;
  to: string;
  rooms: CalendarRoom[];
  bookings: CalendarBooking[];
  roomBlocks: CalendarRoomBlock[];
  bbqReservations: CalendarBbqReservation[];
}

/** `to` is exclusive, matching the API's own range semantics (checkOutDate > from && checkInDate < to). */
export function getCalendarRange(from: string, to: string): Promise<CalendarRange> {
  return adminApi<CalendarRange>(`/admin/ops/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}
