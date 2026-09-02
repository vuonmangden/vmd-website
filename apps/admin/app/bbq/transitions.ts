import type { BbqTransition } from './bbq-api';

/** Mirrors the transitions map in bbq-reservation-state.service.ts — kept as a small, separately-owned UI concern rather than importing server code, the same way booking-detail-view.tsx keeps its own terminal-status set. If the server's map changes without this one following, the worst case is a button that 400s with a clear server message — not a wrong write. */
const AVAILABLE_ACTIONS: Record<string, readonly BbqTransition[]> = {
  PENDING_PAYMENT: ['confirm', 'cancel'],
  PENDING_CONFIRMATION: ['confirm', 'cancel'],
  CONFIRMED: ['check-in', 'cancel'],
  CHECKED_IN: ['check-out'],
};

export function availableActions(status: string): readonly BbqTransition[] {
  return AVAILABLE_ACTIONS[status] ?? [];
}

export const ACTION_LABELS: Record<BbqTransition, string> = {
  confirm: 'Xác nhận',
  cancel: 'Hủy',
  'check-in': 'Check-in',
  'check-out': 'Check-out',
};
