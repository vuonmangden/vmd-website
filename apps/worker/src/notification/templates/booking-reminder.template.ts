import { formatDate } from './format';

export type ReminderOffset = 7 | 3 | 1;

export interface BookingReminderVars {
  guestName: string;
  bookingCode: string;
  checkInDate: Date;
}

export function bookingReminderEmail(offset: ReminderOffset, vars: BookingReminderVars): { subject: string; body: string } {
  const checkIn = formatDate(vars.checkInDate);

  if (offset === 7) {
    return {
      subject: 'Còn 7 ngày nữa đến lịch nghỉ tại Vườn Măng Đen',
      body: [
        `Chào ${vars.guestName},`,
        '',
        'Chỉ còn 7 ngày nữa là đến ngày nhận phòng của bạn tại Vườn Măng Đen!',
        '',
        `Mã đặt phòng: ${vars.bookingCode}`,
        `Nhận phòng: ${checkIn}`,
        '',
        'Nếu cần đổi lịch hoặc có yêu cầu đặc biệt, vui lòng liên hệ hotline 0972 947 942 sớm để chúng tôi sắp xếp.',
        '',
        'Hẹn gặp bạn!',
      ].join('\n'),
    };
  }

  if (offset === 3) {
    return {
      subject: '3 ngày nữa gặp bạn tại Vườn Măng Đen',
      body: [
        `Chào ${vars.guestName},`,
        '',
        'Vườn Măng Đen đang chờ đón bạn — chỉ còn 3 ngày nữa!',
        '',
        `Mã đặt phòng: ${vars.bookingCode}`,
        `Nhận phòng: ${checkIn}`,
        'Giờ nhận phòng tiêu chuẩn: 14:00',
        '',
        'Nếu dự kiến đến sau 18:00, vui lòng báo trước qua hotline 0972 947 942 để chúng tôi giữ phòng đúng giờ cho bạn.',
        '',
        'Hẹn gặp bạn!',
      ].join('\n'),
    };
  }

  return {
    subject: 'Ngày mai gặp bạn tại Vườn Măng Đen!',
    body: [
      `Chào ${vars.guestName},`,
      '',
      'Ngày mai bạn nhận phòng tại Vườn Măng Đen rồi!',
      '',
      `Mã đặt phòng: ${vars.bookingCode}`,
      `Nhận phòng: ${checkIn}, từ 14:00`,
      'Địa chỉ: 24 Đường Phạm Văn Đồng, Măng Đen, Quảng Ngãi',
      '',
      'Vui lòng mang theo CMND/CCCD hoặc hộ chiếu để làm thủ tục nhận phòng. Có gì cần hỗ trợ, gọi hotline 0972 947 942.',
      '',
      'Hẹn gặp bạn ngày mai!',
    ].join('\n'),
  };
}

export function bookingReminderZaloParams(offset: ReminderOffset, vars: BookingReminderVars): Record<string, string> {
  return {
    bookingCode: vars.bookingCode,
    checkInDate: formatDate(vars.checkInDate),
    offsetDays: String(offset),
  };
}

export function reminderTemplateCode(offset: ReminderOffset, channel: 'EMAIL' | 'ZALO'): string {
  return `BOOKING_REMINDER_T${offset}_${channel}`;
}
