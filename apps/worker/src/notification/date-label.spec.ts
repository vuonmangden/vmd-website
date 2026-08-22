import { dateLabel } from './date-label';

describe('dateLabel', () => {
  it('renders the stored UTC-midnight date label without any timezone shift', () => {
    expect(dateLabel(new Date('2026-09-01T00:00:00.000Z'))).toBe('2026-09-01');
  });
});
