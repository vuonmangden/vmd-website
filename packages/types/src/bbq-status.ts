export const BbqStatus = {
  DRAFT: 'DRAFT',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  DEPOSIT_PAID: 'DEPOSIT_PAID',
  CONFIRMED: 'CONFIRMED',
  ARRIVED: 'ARRIVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  EXPIRED: 'EXPIRED',
} as const;

export type BbqStatus = (typeof BbqStatus)[keyof typeof BbqStatus];

export const BBQ_TRANSITIONS: ReadonlyMap<BbqStatus, readonly BbqStatus[]> =
  new Map([
    [BbqStatus.DRAFT, [BbqStatus.PENDING_PAYMENT]],
    [BbqStatus.PENDING_PAYMENT, [BbqStatus.DEPOSIT_PAID, BbqStatus.EXPIRED]],
    [BbqStatus.DEPOSIT_PAID, [BbqStatus.CONFIRMED]],
    [BbqStatus.CONFIRMED, [BbqStatus.ARRIVED, BbqStatus.CANCELLED, BbqStatus.NO_SHOW]],
    [BbqStatus.ARRIVED, [BbqStatus.COMPLETED]],
    [BbqStatus.CANCELLED, [BbqStatus.REFUND_PENDING]],
    [BbqStatus.REFUND_PENDING, [BbqStatus.REFUNDED]],
  ]);

export function isValidBbqTransition(from: BbqStatus, to: BbqStatus): boolean {
  const allowed = BBQ_TRANSITIONS.get(from);
  return allowed !== undefined && allowed.includes(to);
}
