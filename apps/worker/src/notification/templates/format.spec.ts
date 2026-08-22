import { formatDate, formatVnd } from './format';

describe('formatVnd', () => {
  it('formats a VND amount with thousands separators and a currency suffix', () => {
    expect(formatVnd(800_000n)).toBe('800.000đ');
    expect(formatVnd(0n)).toBe('0đ');
  });
});

describe('formatDate', () => {
  it('renders a date-only column as dd/mm/yyyy using its UTC label, not local time', () => {
    expect(formatDate(new Date('2026-09-01T00:00:00.000Z'))).toBe('01/09/2026');
  });
});
