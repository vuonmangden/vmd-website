import { describe, expect, it } from 'vitest';
import { addDays, cellFor, dateRange } from './occupancy';
import type { CalendarBooking, CalendarRoomBlock } from './calendar-api';

function booking(overrides: Partial<CalendarBooking>): CalendarBooking {
  return {
    id: 'b1', bookingCode: 'VMD-BK1', status: 'CONFIRMED',
    checkInDate: '2026-09-02', checkOutDate: '2026-09-04',
    customerName: 'Khách A', roomIds: ['room-1'],
    ...overrides,
  };
}

function block(overrides: Partial<CalendarRoomBlock>): CalendarRoomBlock {
  return { id: 'blk1', roomId: 'room-1', startDate: '2026-09-05', endDate: '2026-09-06', reason: 'Sửa điều hoà', blockType: 'MAINTENANCE', ...overrides };
}

describe('dateRange', () => {
  it('lists every date from the start up to, but excluding, the end', () => {
    expect(dateRange('2026-09-01', '2026-09-04')).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });

  it('returns an empty list when from equals to', () => {
    expect(dateRange('2026-09-01', '2026-09-01')).toEqual([]);
  });
});

describe('addDays', () => {
  it('adds and subtracts days across a month boundary', () => {
    expect(addDays('2026-09-01', 7)).toBe('2026-09-08');
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });
});

describe('cellFor', () => {
  it('marks a night inside the booking span as occupied with the booking code', () => {
    const b = booking({});
    expect(cellFor('room-1', '2026-09-02', [b], [])).toEqual({ status: 'confirmed', label: 'VMD-BK1' });
    expect(cellFor('room-1', '2026-09-03', [b], [])).toEqual({ status: 'confirmed', label: 'VMD-BK1' });
  });

  it('treats the checkout date itself as free, not occupied', () => {
    expect(cellFor('room-1', '2026-09-04', [booking({})], [])).toEqual({ status: 'free', label: '' });
  });

  it('leaves a different room free even during an overlapping booking', () => {
    expect(cellFor('room-2', '2026-09-02', [booking({})], [])).toEqual({ status: 'free', label: '' });
  });

  it.each([
    ['CANCELLED', 'cancelled'],
    ['EXPIRED', 'cancelled'],
    ['CHECKED_IN', 'checked_in'],
    ['CHECKED_OUT', 'checked_in'],
    ['PENDING_PAYMENT', 'pending_payment'],
    ['DRAFT', 'pending_payment'],
    ['CONFIRMED', 'confirmed'],
    ['MODIFIED', 'confirmed'],
  ] as const)('maps booking status %s to cell status %s', (bookingStatus, cellStatus) => {
    expect(cellFor('room-1', '2026-09-02', [booking({ status: bookingStatus })], []).status).toBe(cellStatus);
  });

  it('shows a room block, with its reason as the label', () => {
    expect(cellFor('room-1', '2026-09-05', [], [block({})])).toEqual({ status: 'blocked', label: 'Sửa điều hoà' });
  });

  it('falls back to a generic label when a block has no reason', () => {
    expect(cellFor('room-1', '2026-09-05', [], [block({ reason: null })])).toEqual({ status: 'blocked', label: 'Bảo trì' });
  });

  it('lets a room block win over a booking on the same room and date', () => {
    const overlapping = booking({ checkInDate: '2026-09-05', checkOutDate: '2026-09-07' });
    expect(cellFor('room-1', '2026-09-05', [overlapping], [block({})]).status).toBe('blocked');
  });
});
