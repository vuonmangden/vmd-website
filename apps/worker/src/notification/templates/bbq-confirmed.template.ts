import { formatDate, formatVnd } from './format';

export interface BbqConfirmedVars {
  guestName: string;
  reservationCode: string;
  areaName: string;
  reservationDate: Date;
  startTime: string;
  endTime: string;
  adults: number;
  children: number;
  depositAmount: bigint;
}

export function bbqConfirmedEmail(vars: BbqConfirmedVars): { subject: string; body: string } {
  return {
    subject: `Xác nhận đặt bàn BBQ #${vars.reservationCode} — Vườn Măng Đen`,
    body: [
      `Chào ${vars.guestName},`,
      '',
      'Vườn Măng Đen xác nhận đã giữ bàn BBQ cho bạn.',
      '',
      `Mã đặt bàn: ${vars.reservationCode}`,
      `Khu vực: ${vars.areaName}`,
      `Ngày: ${formatDate(vars.reservationDate)}`,
      `Giờ: ${vars.startTime} – ${vars.endTime}`,
      `Số khách: ${vars.adults} người lớn, ${vars.children} trẻ em`,
      `Đã cọc: ${formatVnd(vars.depositAmount)}`,
      '',
      'Vui lòng có mặt đúng giờ đã đặt. Mọi thay đổi, gọi hotline 0972 947 942 trước giờ hẹn ít nhất 1 tiếng.',
      '',
      'Hẹn gặp bạn tại Vườn Măng Đen!',
    ].join('\n'),
  };
}

export function bbqConfirmedZaloParams(vars: BbqConfirmedVars): Record<string, string> {
  return {
    reservationCode: vars.reservationCode,
    areaName: vars.areaName,
    reservationDate: formatDate(vars.reservationDate),
    startTime: vars.startTime,
    endTime: vars.endTime,
    depositAmount: formatVnd(vars.depositAmount),
  };
}
