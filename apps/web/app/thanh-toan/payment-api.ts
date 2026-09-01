export type PublicPaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'RECONCILIATION_REQUIRED';

export interface PublicPaymentStatusResponse {
  paymentIntentId: string;
  status: PublicPaymentStatus;
  amount: string;
  currency: 'VND';
  expiresAt: string;
  transferContent: string;
}

const apiBase = `${process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:3002'}/api/v1`;
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validPaymentReference(reference: string | null): reference is string {
  return reference !== null && uuidV4.test(reference);
}

export async function getPublicPaymentStatus(reference: string): Promise<PublicPaymentStatusResponse> {
  if (!validPaymentReference(reference)) throw new Error('INVALID_PAYMENT_REFERENCE');
  const response = await fetch(`${apiBase}/public/payment-status/${encodeURIComponent(reference)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('PAYMENT_STATUS_UNAVAILABLE');
  // The API wraps every response in { data, meta, correlationId } (ResponseTransformInterceptor).
  const envelope = (await response.json()) as { data: PublicPaymentStatusResponse };
  return envelope.data;
}

export function formatVnd(amount: string): string {
  const value = Number(amount);
  return Number.isSafeInteger(value) && value >= 0
    ? `${new Intl.NumberFormat('vi-VN').format(value)} VND`
    : 'Không thể hiển thị số tiền';
}

export function nextPaymentPollDelay(status: PublicPaymentStatus, elapsedMs: number): number | null {
  if (status !== 'PENDING') return null;
  return elapsedMs < 5 * 60_000 ? 10_000 : 30_000;
}
