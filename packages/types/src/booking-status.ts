export const BookingStatus = {
  DRAFT: 'DRAFT',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CONFIRMED: 'CONFIRMED',
  MODIFIED: 'MODIFIED',
  CANCELLED: 'CANCELLED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  NO_SHOW: 'NO_SHOW',
  EXPIRED: 'EXPIRED',
} as const;

export type BookingStatus =
  (typeof BookingStatus)[keyof typeof BookingStatus];

export const BOOKING_TRANSITIONS: ReadonlyMap<BookingStatus, readonly BookingStatus[]> =
  new Map([
    [BookingStatus.DRAFT, [BookingStatus.PENDING_PAYMENT]],
    [BookingStatus.PENDING_PAYMENT, [BookingStatus.PARTIALLY_PAID, BookingStatus.PAID, BookingStatus.EXPIRED]],
    [BookingStatus.PARTIALLY_PAID, [BookingStatus.CONFIRMED]],
    [BookingStatus.PAID, [BookingStatus.CONFIRMED]],
    [BookingStatus.CONFIRMED, [BookingStatus.MODIFIED, BookingStatus.CANCELLED, BookingStatus.CHECKED_IN, BookingStatus.NO_SHOW]],
    [BookingStatus.MODIFIED, [BookingStatus.CONFIRMED]],
    [BookingStatus.CHECKED_IN, [BookingStatus.CHECKED_OUT]],
    [BookingStatus.CANCELLED, [BookingStatus.REFUND_PENDING]],
    [BookingStatus.REFUND_PENDING, [BookingStatus.REFUNDED]],
  ]);

export function isValidBookingTransition(from: BookingStatus, to: BookingStatus): boolean {
  const allowed = BOOKING_TRANSITIONS.get(from);
  return allowed !== undefined && allowed.includes(to);
}
