/**
 * One entry per shipped admin section — extend this as each ADM-003 slice
 * adds a real page, never ahead of it. A nav link to a route that doesn't
 * exist yet is worse than no link.
 */
export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '/', label: 'Tổng quan' },
  { href: '/calendar', label: 'Lịch phòng' },
  { href: '/bookings', label: 'Đặt phòng' },
  { href: '/bbq', label: 'BBQ' },
];
