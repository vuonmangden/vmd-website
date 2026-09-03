import { adminApi } from '../lib/api-client';

/**
 * Money crosses the wire as an integer-VND string, never a number — the API
 * stores it as BigInt and `JSON.stringify` cannot serialize BigInt, so every
 * money field is `.toString()`-ed server-side. Keep these typed as `string`
 * and format with `formatVnd`; parsing them into a JS number would silently
 * lose precision above 2^53.
 */
export interface OpenReconciliationCaseRef {
  id: string;
  reason: string;
}

export interface PaymentIntentSummary {
  id: string;
  bookingId: string | null;
  bbqReservationId: string | null;
  referenceType: 'BOOKING' | 'BBQ_RESERVATION';
  referenceCode: string;
  customerName: string;
  provider: string;
  status: string;
  amount: string;
  paidAmount: string;
  currency: string;
  transferContent: string;
  expiresAt: string;
  createdAt: string;
  openReconciliationCases: OpenReconciliationCaseRef[];
}

export interface PaymentIntentListResult {
  items: PaymentIntentSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ReconciliationCasePaymentIntent {
  id: string;
  bookingId: string | null;
  bbqReservationId: string | null;
  amount: string;
  currency: string;
  status: string;
  expiresAt: string;
  transferContent: string;
}

export interface ReconciliationCase {
  id: string;
  paymentIntentId: string;
  status: 'OPEN' | 'RESOLVED';
  reason: string;
  expectedAmount: string;
  receivedAmount: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionOutcome: string | null;
  resolutionNote: string | null;
  paymentIntent: ReconciliationCasePaymentIntent | null;
}

export const RECONCILIATION_OUTCOMES = ['REFUNDED', 'RESTORED', 'OTHER'] as const;
export type ReconciliationOutcome = (typeof RECONCILIATION_OUTCOMES)[number];

const PAGE_SIZE = 50;

export function listPaymentIntents(filters: { status?: string; page?: number }): Promise<PaymentIntentListResult> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(PAGE_SIZE));
  return adminApi<PaymentIntentListResult>(`/admin/payments?${params.toString()}`);
}

export function listReconciliationCases(filters: { status?: 'OPEN' | 'RESOLVED' }): Promise<ReconciliationCase[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return adminApi<ReconciliationCase[]>(`/admin/payments/reconciliation-cases${query ? `?${query}` : ''}`);
}

/**
 * Records a manual decision only. The API deliberately moves no money and
 * changes no booking — a refund is executed by staff outside the system and
 * a restore goes through the normal booking flow, so this is an audit trail
 * of what a manager decided, not an instruction to the system.
 */
export function resolveReconciliationCase(id: string, outcome: ReconciliationOutcome, note: string): Promise<ReconciliationCase> {
  return adminApi<ReconciliationCase>(`/admin/payments/reconciliation-cases/${encodeURIComponent(id)}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ outcome, note }),
  });
}
