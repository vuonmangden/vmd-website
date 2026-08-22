import { formatVnd } from './format';

export interface PaymentExceptionVars {
  referenceCode: string;
  reason: string;
  expectedAmount: bigint;
  receivedAmount: bigint;
  occurredAt: Date;
}

/** Staff-facing only — never submitted as a Zalo template, never sent to a guest. */
export function paymentExceptionEmail(vars: PaymentExceptionVars): { subject: string; body: string } {
  return {
    subject: `[Cần xử lý] Bất thường thanh toán — ${vars.referenceCode}`,
    body: [
      'Có giao dịch cần Quản lý/Kế toán kiểm tra thủ công:',
      '',
      `Mã: ${vars.referenceCode}`,
      `Loại bất thường: ${vars.reason}`,
      `Số tiền yêu cầu: ${formatVnd(vars.expectedAmount)}`,
      `Số tiền nhận được: ${formatVnd(vars.receivedAmount)}`,
      `Thời điểm: ${vars.occurredAt.toISOString()}`,
      '',
      'Xem chi tiết và xử lý trong trang quản trị → Đối soát thanh toán.',
    ].join('\n'),
  };
}
