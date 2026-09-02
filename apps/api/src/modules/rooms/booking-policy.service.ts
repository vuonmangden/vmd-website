import { Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';

export type DepositPolicy = 'STANDARD_50' | 'LAST_MINUTE_100' | 'HOLIDAY_100';

export interface DepositQuote {
  amount: bigint;
  percent: 50 | 100;
  policy: DepositPolicy;
}

const DAY_MS = 86_400_000;
const BOOKING_POLICY_CLOCK = 'BOOKING_POLICY_CLOCK';
const BOOKING_POLICY_HOLD_MINUTES = 'BOOKING_POLICY_HOLD_MINUTES';

@Injectable()
export class BookingPolicyService {
  constructor(
    @Optional() @Inject(BOOKING_POLICY_CLOCK) private readonly now: () => Date = () => new Date(),
    @Optional() @Inject(BOOKING_POLICY_HOLD_MINUTES) private readonly configuredHoldMinutes = readHoldMinutes(),
  ) {}

  holdMinutes(): number { return this.configuredHoldMinutes; }

  holdExpiresAt(createdAt = this.now()): Date {
    return new Date(createdAt.getTime() + this.configuredHoldMinutes * 60_000);
  }

  deposit(total: bigint, checkInDate: Date, usesHolidayRate: boolean, createdAt = this.now()): DepositQuote {
    if (total < 0n || Number.isNaN(checkInDate.getTime())) throw unavailablePolicy();
    const daysBeforeCheckIn = Math.floor((checkInDate.getTime() - operationalDay(createdAt).getTime()) / DAY_MS);
    if (usesHolidayRate) return { amount: total, percent: 100, policy: 'HOLIDAY_100' };
    if (daysBeforeCheckIn <= 3) return { amount: total, percent: 100, policy: 'LAST_MINUTE_100' };
    return { amount: roundDownToThousand(total / 2n), percent: 50, policy: 'STANDARD_50' };
  }
}

export function readHoldMinutes(environment: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number.parseInt(environment['BOOKING_HOLD_MINUTES'] ?? '30', 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 360) throw unavailablePolicy();
  return parsed;
}

function operationalDay(instant: Date): Date {
  const label = new Date(instant.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return new Date(`${label}T00:00:00.000Z`);
}

function roundDownToThousand(value: bigint): bigint { return (value / 1_000n) * 1_000n; }
function unavailablePolicy() { return new ServiceUnavailableException({ code: 'BOOKING_POLICY_UNAVAILABLE', message: 'Booking policy is not configured safely' }); }
