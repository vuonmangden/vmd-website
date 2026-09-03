import { describe, expect, it } from 'vitest';
import { formatVnd } from './format';

describe('formatVnd', () => {
  it('groups digits by thousands', () => {
    expect(formatVnd('1200000')).toBe('1.200.000');
    expect(formatVnd('500')).toBe('500');
    expect(formatVnd('1000')).toBe('1.000');
  });

  it('handles zero and a negative amount', () => {
    expect(formatVnd('0')).toBe('0');
    expect(formatVnd('-150000')).toBe('-150.000');
  });

  it('returns the raw input unchanged if it is not a plain integer string', () => {
    expect(formatVnd('not-a-number')).toBe('not-a-number');
  });
});
