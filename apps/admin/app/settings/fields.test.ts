import { describe, expect, it } from 'vitest';
import { extractAmount, extractHours } from './fields';

describe('extractHours', () => {
  it('reads the number out of the { hours } shape', () => {
    expect(extractHours({ hours: 24 })).toBe(24);
  });

  it('returns null for a masked secret (null) or any other shape', () => {
    expect(extractHours(null)).toBeNull();
    expect(extractHours('24')).toBeNull();
    expect(extractHours({ amount: 24 })).toBeNull();
  });
});

describe('extractAmount', () => {
  it('reads the number out of the { amount } shape', () => {
    expect(extractAmount({ amount: 150000 })).toBe(150000);
  });

  it('returns null for anything else', () => {
    expect(extractAmount(undefined)).toBeNull();
  });
});
