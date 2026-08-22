import { reportRows, toCsv } from './report-csv';

describe('toCsv', () => {
  it('neutralises a leading formula character so a spreadsheet app reads the cell as text', () => {
    const csv = toCsv([['dimension', 'key', 'count'], ['status', '=SUM(A1:A9)', '1']]);

    expect(csv).toContain("'=SUM(A1:A9)");
  });

  it('quotes and escapes a cell containing a comma, quote, or newline', () => {
    const csv = toCsv([['a,b', 'has "quotes"', 'line\nbreak']]);

    expect(csv).toBe('"a,b","has ""quotes""","line\nbreak"');
  });

  it('joins rows with CRLF and cells with a comma', () => {
    const csv = toCsv([['a', 'b'], ['c', 'd']]);

    expect(csv).toBe('a,b\r\nc,d');
  });
});

describe('reportRows', () => {
  it('flattens a bookings report into status and source rows', () => {
    const rows = reportRows('bookings', {
      from: '2026-08-01',
      to: '2026-08-08',
      total: 2,
      byStatus: { CONFIRMED: 2 },
      bySource: { DIRECT: 1, GOOGLE: 1 },
    });

    expect(rows).toEqual([
      ['dimension', 'key', 'count'],
      ['status', 'CONFIRMED', '2'],
      ['source', 'DIRECT', '1'],
      ['source', 'GOOGLE', '1'],
    ]);
  });

  it('flattens an occupancy report into one row per day', () => {
    const rows = reportRows('occupancy', {
      from: '2026-08-01',
      to: '2026-08-02',
      days: [{ date: '2026-08-01', occupiedRooms: 4, availableRooms: 10, occupancyRate: 40 }],
    });

    expect(rows).toEqual([
      ['date', 'occupiedRooms', 'availableRooms', 'occupancyRate'],
      ['2026-08-01', '4', '10', '40'],
    ]);
  });
});
