import { describe, expect, it } from 'vitest';
import { availableActions } from './transitions';

describe('availableActions', () => {
  it.each([
    ['PENDING_PAYMENT', ['confirm', 'cancel']],
    ['PENDING_CONFIRMATION', ['confirm', 'cancel']],
    ['CONFIRMED', ['check-in', 'cancel']],
    ['CHECKED_IN', ['check-out']],
    ['CHECKED_OUT', []],
    ['CANCELLED', []],
    ['EXPIRED', []],
  ] as const)('returns %2$s for status %s', (status, expected) => {
    expect(availableActions(status)).toEqual(expected);
  });
});
