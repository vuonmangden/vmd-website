import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Cancellation and date-change rules from the 2026 rate card supplied by the
 * owner on 2026-08-17 (`VMD_Bao_Gia_Phong_2026_Khach_Hang.docx`, effective
 * 25/08/2026). See `docs/09_MILESTONE_0_INPUT_PACK.md` §8.
 *
 * Pure calculation only. Phase 1 never issues a refund automatically
 * (AGENTS.md §9); this decides how much is refundable so a staff member can
 * act on it with an audit trail.
 */

/** Which of the two published tables applies to a booking. */
export const CancellationPolicy = {
  /** Chủ nhật–Thứ năm and Thứ sáu–Thứ bảy bookings. */
  STANDARD: 'STANDARD',
  /** Lễ, Tết and peak-season bookings. */
  HOLIDAY: 'HOLIDAY',
} as const;

export type CancellationPolicy =
  (typeof CancellationPolicy)[keyof typeof CancellationPolicy];

const HOUR = 60 * 60 * 1000;

interface Tier {
  /** Inclusive lower bound, in hours before check-in. */
  minHoursBefore: number;
  /** Percentage of the amount already paid that is returned. */
  refundPercent: number;
  /** Whether a date change is still offered at this tier. */
  dateChangeAllowed: boolean;
  code: string;
}

/**
 * Ordered widest-first. "Từ 2-3 ngày" spans [48h, 96h) and "dưới 48 giờ" the
 * remainder, so the two published buckets tile the range without a gap.
 */
const TIERS: Record<CancellationPolicy, readonly Tier[]> = {
  [CancellationPolicy.STANDARD]: [
    { minHoursBefore: 7 * 24, refundPercent: 100, dateChangeAllowed: true, code: 'STANDARD_7_DAYS_PLUS' },
    { minHoursBefore: 4 * 24, refundPercent: 50, dateChangeAllowed: true, code: 'STANDARD_4_TO_6_DAYS' },
    { minHoursBefore: 48, refundPercent: 0, dateChangeAllowed: true, code: 'STANDARD_2_TO_3_DAYS' },
    { minHoursBefore: 0, refundPercent: 0, dateChangeAllowed: false, code: 'STANDARD_UNDER_48_HOURS' },
  ],
  [CancellationPolicy.HOLIDAY]: [
    { minHoursBefore: 14 * 24, refundPercent: 100, dateChangeAllowed: true, code: 'HOLIDAY_14_DAYS_PLUS' },
    { minHoursBefore: 7 * 24, refundPercent: 50, dateChangeAllowed: true, code: 'HOLIDAY_7_TO_13_DAYS' },
    { minHoursBefore: 0, refundPercent: 0, dateChangeAllowed: false, code: 'HOLIDAY_UNDER_7_DAYS' },
  ],
};

/** A booking may only be moved once, and only within this window. */
export const DATE_CHANGE_MAX_DAYS_AHEAD = 60;

export interface CancellationQuoteInput {
  policy: CancellationPolicy;
  checkInAt: Date;
  /**
   * What the guest actually transferred, in VND. The published tables refund a
   * percentage of the amount paid, not of the booking total — with a 50%
   * deposit, "hoàn 100%" returns the deposit, not the full booking value.
   */
  amountPaid: bigint;
  /** Defaults to now; injectable so tests are not clock-dependent. */
  now?: Date;
  /** A booking already moved once loses the standard cancellation rights. */
  dateChangeUsed?: boolean;
}

export interface CancellationQuote {
  tierCode: string;
  hoursBeforeCheckIn: number;
  refundPercent: number;
  refundAmount: bigint;
  forfeitedAmount: bigint;
  dateChangeAllowed: boolean;
}

export interface DateChangeCheckInput {
  policy: CancellationPolicy;
  checkInAt: Date;
  newCheckInAt: Date;
  originalCheckInAt: Date;
  dateChangeUsed?: boolean;
  now?: Date;
}

export type DateChangeRefusal =
  | 'DATE_CHANGE_ALREADY_USED'
  | 'DATE_CHANGE_WINDOW_CLOSED'
  | 'DATE_CHANGE_BEYOND_60_DAYS'
  | 'DATE_CHANGE_NOT_IN_FUTURE';

export interface DateChangeCheck {
  allowed: boolean;
  reason?: DateChangeRefusal;
}

@Injectable()
export class CancellationPolicyService {
  /** How much of what the guest paid comes back if they cancel now. */
  quote(input: CancellationQuoteInput): CancellationQuote {
    if (input.amountPaid < 0n) {
      throw new BadRequestException({
        code: 'AMOUNT_PAID_INVALID',
        message: 'Amount paid cannot be negative',
      });
    }

    const hoursBeforeCheckIn = hoursUntil(input.checkInAt, input.now ?? new Date());
    const tier = resolveTier(input.policy, hoursBeforeCheckIn);

    // A booking that already used its one date change forfeits the standard
    // cancellation rights entirely, whatever the notice period.
    const forfeitedByDateChange = input.dateChangeUsed === true;
    const refundPercent = forfeitedByDateChange ? 0 : tier.refundPercent;

    const refundAmount = percentOf(input.amountPaid, refundPercent);

    return {
      tierCode: forfeitedByDateChange ? 'DATE_CHANGE_ALREADY_USED' : tier.code,
      hoursBeforeCheckIn,
      refundPercent,
      refundAmount,
      forfeitedAmount: input.amountPaid - refundAmount,
      dateChangeAllowed: !forfeitedByDateChange && tier.dateChangeAllowed,
    };
  }

  /** Whether the guest may still move this booking, and why not if they cannot. */
  checkDateChange(input: DateChangeCheckInput): DateChangeCheck {
    if (input.dateChangeUsed === true) {
      return { allowed: false, reason: 'DATE_CHANGE_ALREADY_USED' };
    }

    const now = input.now ?? new Date();
    const tier = resolveTier(input.policy, hoursUntil(input.checkInAt, now));
    if (!tier.dateChangeAllowed) {
      return { allowed: false, reason: 'DATE_CHANGE_WINDOW_CLOSED' };
    }

    if (input.newCheckInAt.getTime() <= now.getTime()) {
      return { allowed: false, reason: 'DATE_CHANGE_NOT_IN_FUTURE' };
    }

    // The 60-day window runs from the original stay date, not from today, so a
    // guest cannot walk the booking forward indefinitely.
    const latestAllowed =
      input.originalCheckInAt.getTime() + DATE_CHANGE_MAX_DAYS_AHEAD * 24 * HOUR;
    if (input.newCheckInAt.getTime() > latestAllowed) {
      return { allowed: false, reason: 'DATE_CHANGE_BEYOND_60_DAYS' };
    }

    return { allowed: true };
  }

  /**
   * Price difference the guest owes when moving to a costlier date. A cheaper
   * date returns zero: the rate card states the difference is not refunded.
   */
  dateChangeDifference(originalTotal: bigint, newTotal: bigint): bigint {
    const difference = newTotal - originalTotal;
    return difference > 0n ? difference : 0n;
  }
}

function resolveTier(policy: CancellationPolicy, hoursBeforeCheckIn: number): Tier {
  const tiers = TIERS[policy];
  if (!tiers) {
    throw new BadRequestException({
      code: 'CANCELLATION_POLICY_UNKNOWN',
      message: 'Unknown cancellation policy',
    });
  }

  // Past check-in counts as a no-show: nothing is refunded under either table.
  const effectiveHours = Math.max(hoursBeforeCheckIn, 0);
  const tier = tiers.find((candidate) => effectiveHours >= candidate.minHoursBefore);

  // The last tier has minHoursBefore 0, so this is unreachable; it exists so a
  // future edit to TIERS fails loudly instead of returning undefined.
  if (!tier) {
    throw new BadRequestException({
      code: 'CANCELLATION_TIER_UNRESOLVED',
      message: 'No cancellation tier matched',
    });
  }

  return tier;
}

function hoursUntil(target: Date, now: Date): number {
  return Math.floor((target.getTime() - now.getTime()) / HOUR);
}

/** Integer VND throughout; fractions are floored so the guest is never over-refunded. */
function percentOf(amount: bigint, percent: number): bigint {
  if (percent === 0) return 0n;
  if (percent === 100) return amount;
  return (amount * BigInt(percent)) / 100n;
}
