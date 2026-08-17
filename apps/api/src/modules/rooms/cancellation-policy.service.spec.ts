import { BadRequestException } from '@nestjs/common';
import {
  CancellationPolicy,
  CancellationPolicyService,
  DATE_CHANGE_MAX_DAYS_AHEAD,
} from './cancellation-policy.service';

const NOW = new Date('2026-09-01T00:00:00.000Z');
const PAID = 1_000_000n;

function checkInIn(hours: number): Date {
  return new Date(NOW.getTime() + hours * 60 * 60 * 1000);
}

describe('CancellationPolicyService.quote — standard table', () => {
  const service = new CancellationPolicyService();

  function quoteAt(hours: number) {
    return service.quote({
      policy: CancellationPolicy.STANDARD,
      checkInAt: checkInIn(hours),
      amountPaid: PAID,
      now: NOW,
    });
  }

  it('refunds everything from 7 days out', () => {
    const result = quoteAt(7 * 24);
    expect(result.refundPercent).toBe(100);
    expect(result.refundAmount).toBe(1_000_000n);
    expect(result.forfeitedAmount).toBe(0n);
    expect(result.tierCode).toBe('STANDARD_7_DAYS_PLUS');
  });

  it('refunds half from 4 to 6 days', () => {
    for (const days of [4, 5, 6]) {
      const result = quoteAt(days * 24);
      expect(result.refundPercent).toBe(50);
      expect(result.refundAmount).toBe(500_000n);
      expect(result.tierCode).toBe('STANDARD_4_TO_6_DAYS');
    }
  });

  it('refunds nothing from 2 to 3 days but still allows a date change', () => {
    for (const hours of [48, 72, 95]) {
      const result = quoteAt(hours);
      expect(result.refundPercent).toBe(0);
      expect(result.refundAmount).toBe(0n);
      expect(result.dateChangeAllowed).toBe(true);
      expect(result.tierCode).toBe('STANDARD_2_TO_3_DAYS');
    }
  });

  it('refuses both refund and date change under 48 hours', () => {
    for (const hours of [47, 12, 1, 0]) {
      const result = quoteAt(hours);
      expect(result.refundPercent).toBe(0);
      expect(result.dateChangeAllowed).toBe(false);
      expect(result.tierCode).toBe('STANDARD_UNDER_48_HOURS');
    }
  });

  it('treats the tier boundaries as inclusive lower bounds', () => {
    expect(quoteAt(7 * 24).refundPercent).toBe(100);
    expect(quoteAt(7 * 24 - 1).refundPercent).toBe(50);
    expect(quoteAt(4 * 24).refundPercent).toBe(50);
    expect(quoteAt(4 * 24 - 1).refundPercent).toBe(0);
    expect(quoteAt(48).tierCode).toBe('STANDARD_2_TO_3_DAYS');
    expect(quoteAt(47).tierCode).toBe('STANDARD_UNDER_48_HOURS');
  });

  it('treats a passed check-in as a no-show with nothing refunded', () => {
    const result = quoteAt(-72);
    expect(result.refundPercent).toBe(0);
    expect(result.dateChangeAllowed).toBe(false);
  });
});

describe('CancellationPolicyService.quote — holiday table', () => {
  const service = new CancellationPolicyService();

  function quoteAt(hours: number) {
    return service.quote({
      policy: CancellationPolicy.HOLIDAY,
      checkInAt: checkInIn(hours),
      amountPaid: PAID,
      now: NOW,
    });
  }

  it('refunds everything from 14 days out', () => {
    expect(quoteAt(14 * 24).refundPercent).toBe(100);
    expect(quoteAt(30 * 24).tierCode).toBe('HOLIDAY_14_DAYS_PLUS');
  });

  it('refunds half from 7 to 13 days', () => {
    for (const days of [7, 10, 13]) {
      expect(quoteAt(days * 24).refundPercent).toBe(50);
    }
  });

  it('refunds nothing under 7 days', () => {
    for (const days of [6, 3, 0]) {
      const result = quoteAt(days * 24);
      expect(result.refundPercent).toBe(0);
      expect(result.tierCode).toBe('HOLIDAY_UNDER_7_DAYS');
    }
  });

  it('is stricter than the standard table at the same notice', () => {
    const standard = new CancellationPolicyService().quote({
      policy: CancellationPolicy.STANDARD,
      checkInAt: checkInIn(8 * 24),
      amountPaid: PAID,
      now: NOW,
    });
    expect(standard.refundPercent).toBe(100);
    expect(quoteAt(8 * 24).refundPercent).toBe(50);
  });
});

describe('CancellationPolicyService.quote — amounts', () => {
  const service = new CancellationPolicyService();

  it('refunds a percentage of what was paid, not the booking total', () => {
    // 50% deposit on a 2.4m booking, cancelled with full-refund notice.
    const result = service.quote({
      policy: CancellationPolicy.STANDARD,
      checkInAt: checkInIn(10 * 24),
      amountPaid: 1_200_000n,
      now: NOW,
    });
    expect(result.refundAmount).toBe(1_200_000n);
  });

  it('floors a half refund of an odd amount so the guest is never over-refunded', () => {
    const result = service.quote({
      policy: CancellationPolicy.STANDARD,
      checkInAt: checkInIn(5 * 24),
      amountPaid: 1_000_001n,
      now: NOW,
    });
    expect(result.refundAmount).toBe(500_000n);
    expect(result.forfeitedAmount).toBe(500_001n);
  });

  it('always splits the paid amount exactly between refund and forfeit', () => {
    for (const hours of [10 * 24, 5 * 24, 60, 10]) {
      const result = service.quote({
        policy: CancellationPolicy.STANDARD,
        checkInAt: checkInIn(hours),
        amountPaid: 987_654n,
        now: NOW,
      });
      expect(result.refundAmount + result.forfeitedAmount).toBe(987_654n);
    }
  });

  it('handles a booking with nothing paid yet', () => {
    const result = service.quote({
      policy: CancellationPolicy.STANDARD,
      checkInAt: checkInIn(10 * 24),
      amountPaid: 0n,
      now: NOW,
    });
    expect(result.refundAmount).toBe(0n);
    expect(result.forfeitedAmount).toBe(0n);
  });

  it('rejects a negative amount', () => {
    expect(() =>
      service.quote({
        policy: CancellationPolicy.STANDARD,
        checkInAt: checkInIn(10 * 24),
        amountPaid: -1n,
        now: NOW,
      }),
    ).toThrow(BadRequestException);
  });
});

describe('CancellationPolicyService — a booking already moved once', () => {
  const service = new CancellationPolicyService();

  it('refunds nothing even with full notice', () => {
    const result = service.quote({
      policy: CancellationPolicy.STANDARD,
      checkInAt: checkInIn(30 * 24),
      amountPaid: PAID,
      now: NOW,
      dateChangeUsed: true,
    });
    expect(result.refundPercent).toBe(0);
    expect(result.refundAmount).toBe(0n);
    expect(result.tierCode).toBe('DATE_CHANGE_ALREADY_USED');
    expect(result.dateChangeAllowed).toBe(false);
  });

  it('cannot be moved a second time', () => {
    const check = service.checkDateChange({
      policy: CancellationPolicy.STANDARD,
      checkInAt: checkInIn(30 * 24),
      originalCheckInAt: checkInIn(30 * 24),
      newCheckInAt: checkInIn(40 * 24),
      now: NOW,
      dateChangeUsed: true,
    });
    expect(check).toEqual({ allowed: false, reason: 'DATE_CHANGE_ALREADY_USED' });
  });
});

describe('CancellationPolicyService.checkDateChange', () => {
  const service = new CancellationPolicyService();

  const base = {
    policy: CancellationPolicy.STANDARD,
    checkInAt: checkInIn(10 * 24),
    originalCheckInAt: checkInIn(10 * 24),
    now: NOW,
  };

  it('allows a move inside the 60-day window', () => {
    expect(
      service.checkDateChange({ ...base, newCheckInAt: checkInIn(40 * 24) }),
    ).toEqual({ allowed: true });
  });

  it('measures the 60 days from the original stay date', () => {
    const original = checkInIn(10 * 24);
    const lastAllowed = new Date(
      original.getTime() + DATE_CHANGE_MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000,
    );

    expect(
      service.checkDateChange({ ...base, newCheckInAt: lastAllowed }),
    ).toEqual({ allowed: true });

    expect(
      service.checkDateChange({
        ...base,
        newCheckInAt: new Date(lastAllowed.getTime() + 1),
      }),
    ).toEqual({ allowed: false, reason: 'DATE_CHANGE_BEYOND_60_DAYS' });
  });

  it('refuses once the change window has closed', () => {
    expect(
      service.checkDateChange({
        ...base,
        checkInAt: checkInIn(24),
        newCheckInAt: checkInIn(20 * 24),
      }),
    ).toEqual({ allowed: false, reason: 'DATE_CHANGE_WINDOW_CLOSED' });
  });

  it('refuses a new date in the past', () => {
    expect(
      service.checkDateChange({ ...base, newCheckInAt: checkInIn(-24) }),
    ).toEqual({ allowed: false, reason: 'DATE_CHANGE_NOT_IN_FUTURE' });
  });

  it('applies the holiday window rules too', () => {
    expect(
      service.checkDateChange({
        ...base,
        policy: CancellationPolicy.HOLIDAY,
        checkInAt: checkInIn(6 * 24),
        newCheckInAt: checkInIn(20 * 24),
      }),
    ).toEqual({ allowed: false, reason: 'DATE_CHANGE_WINDOW_CLOSED' });
  });
});

describe('CancellationPolicyService.dateChangeDifference', () => {
  const service = new CancellationPolicyService();

  it('charges the difference when the new date costs more', () => {
    expect(service.dateChangeDifference(650_000n, 850_000n)).toBe(200_000n);
  });

  it('returns nothing when the new date is cheaper — the difference is not refunded', () => {
    expect(service.dateChangeDifference(850_000n, 650_000n)).toBe(0n);
  });

  it('returns nothing when the price is unchanged', () => {
    expect(service.dateChangeDifference(650_000n, 650_000n)).toBe(0n);
  });
});
