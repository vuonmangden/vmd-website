import { formatDate, formatVnd } from './format';

export interface BookingConfirmedVars {
  guestName: string;
  bookingCode: string;
  roomName: string;
  checkInDate: Date;
  checkOutDate: Date;
  adults: number;
  children: number;
  depositAmount: bigint;
  totalAmount: bigint;
}

export function bookingConfirmedEmail(vars: BookingConfirmedVars): { subject: string; body: string } {
  return {
    subject: `Xác nhận đặt phòng #${vars.bookingCode} — Vườn Măng Đen`,
    body: [
      `Chào ${vars.guestName},`,
      '',
      'Vườn Măng Đen xác nhận đã nhận đặt phòng của bạn.',
      '',
      `Mã đặt phòng: ${vars.bookingCode}`,
      `Phòng: ${vars.roomName}`,
      `Nhận phòng: ${formatDate(vars.checkInDate)}`,
      `Trả phòng: ${formatDate(vars.checkOutDate)}`,
      `Số khách: ${vars.adults} người lớn, ${vars.children} trẻ em`,
      `Đã cọc: ${formatVnd(vars.depositAmount)} / Tổng giá trị: ${formatVnd(vars.totalAmount)}`,
      '',
      'Vui lòng lưu mã đặt phòng để tra cứu hoặc liên hệ khi cần hỗ trợ.',
      'Mọi thắc mắc, gọi hotline 0972 947 942 hoặc trả lời email này.',
      '',
      'Hẹn gặp bạn tại Vườn Măng Đen — nơi nghỉ dưỡng, giao lưu kết nối bạn bè.',
    ].join('\n'),
  };
}

export function bookingConfirmedZaloParams(vars: BookingConfirmedVars): Record<string, string> {
  return {
    bookingCode: vars.bookingCode,
    roomName: vars.roomName,
    checkInDate: formatDate(vars.checkInDate),
    checkOutDate: formatDate(vars.checkOutDate),
    depositAmount: formatVnd(vars.depositAmount),
    totalAmount: formatVnd(vars.totalAmount),
  };
}
