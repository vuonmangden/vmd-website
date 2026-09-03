import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { NotificationJobService } from './notification-job.service';
import type { ReminderOffset } from './templates/booking-reminder.template';
import { dateLabel } from './date-label';

const SCAN_INTERVAL_MS = 30 * 60_000;
const REMINDER_OFFSETS: readonly ReminderOffset[] = [7, 3, 1];
const DAY_MS = 24 * 60 * 60_000;

/**
 * Scans daily for bookings hitting T-7/T-3/T-1 and schedules their
 * reminder jobs for 10:00 (Asia/Ho_Chi_Minh, confirmed 2026-08-22 — see
 * docs/08_PROGRESS_TRACKER.md NTF-005). Runs on a plain interval rather than
 * a once-a-day cron: `enqueueBookingReminder`'s per-date deduplication key
 * makes a repeat scan on the same day a no-op, so there's no harm — and
 * real benefit — in checking often enough to catch a booking created after
 * the day's first pass.
 *
 * Only `status: 'CONFIRMED'` bookings are queried, so a cancelled booking
 * never gets a reminder scheduled in the first place; a booking cancelled
 * or rescheduled *after* a job already exists is caught by
 * `NotificationDispatchService`'s send-time recheck instead.
 */
@Injectable()
export class ReminderScanService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderScanService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: NotificationJobService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      /**
       * `scan` awaits both a `findMany` and every `enqueueBookingReminder`
       * with no internal guard, so any transient database error would escape
       * as an unhandled rejection and terminate the worker instead of
       * retrying on the next tick.
       */
      this.scan().catch((error: unknown) => {
        this.logger.error(`Reminder scan failed; retrying next interval: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, SCAN_INTERVAL_MS);
    this.logger.log('Reminder scan started');
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async scan(): Promise<number> {
    const today = operationalToday();
    const sendAt = new Date(`${dateLabel(today)}T10:00:00.000+07:00`);

    let enqueued = 0;
    for (const offset of REMINDER_OFFSETS) {
      const targetDate = new Date(today.getTime() + offset * DAY_MS);
      const bookings = await this.prisma.booking.findMany({
        where: { checkInDate: targetDate, status: 'CONFIRMED' },
        select: { id: true },
      });

      for (const booking of bookings) {
        await this.jobs.enqueueBookingReminder(booking.id, offset, sendAt);
        enqueued++;
      }
    }

    if (enqueued > 0) {
      this.logger.log(`Reminder scan enqueued ${enqueued} booking reminder(s)`);
    }

    return enqueued;
  }
}

/** Same Asia/Ho_Chi_Minh operational-day convention used throughout the front desk and BBQ calendar. */
function operationalToday(): Date {
  const nowInHoChiMinh = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return new Date(`${nowInHoChiMinh.toISOString().slice(0, 10)}T00:00:00.000Z`);
}
