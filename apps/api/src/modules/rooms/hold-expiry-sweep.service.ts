import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PaymentsService } from '../payments/payments.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { ResourceHoldsService } from './resource-holds.service';

const SWEEP_INTERVAL_MS = 5 * 60_000;

/**
 * `PaymentsService.expireDue()` (PENDING payment intents -> EXPIRED, which
 * also releases the linked booking/BBQ reservation and its RoomOccupancy
 * rows) and `ResourceHoldsService.expireDue()` (stale ACTIVE holds) were
 * both fully implemented and unit-tested but never invoked anywhere — SEC-001
 * found this leaves an unauthenticated visitor able to permanently lock any
 * room+date by creating a booking and never paying, with no admin recovery
 * path (the admin API has no transition out of PENDING_PAYMENT other than
 * EXPIRED, which only this sweep produces). Mirrors the plain-`setInterval`
 * pattern already used by `apps/worker`'s `ReminderScanService` rather than
 * adding a scheduler dependency or wiring the pre-registered-but-unused
 * BOOKING_HOLD_EXPIRY/BBQ_HOLD_EXPIRY BullMQ queues, whose original intended
 * semantics are undocumented.
 */
@Injectable()
export class HoldExpirySweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HoldExpirySweepService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly payments: PaymentsService,
    private readonly resourceHolds: ResourceHoldsService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      /**
       * A bare `void this.sweep()` would turn any transient database error
       * into an unhandled rejection, which Node terminates the process for —
       * taking the whole HTTP server down with it, since this sweep shares
       * the API process. A polling loop exists precisely to tolerate a blip
       * and retry on the next tick, so failures are logged, not fatal.
       */
      this.sweep().catch((error: unknown) => {
        this.logger.error(`Expiry sweep failed; retrying next interval: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, SWEEP_INTERVAL_MS);
    this.logger.log('Hold/payment-intent expiry sweep started');
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep(): Promise<{ expiredPaymentIntents: number; expiredHolds: number }> {
    const { expired: expiredPaymentIntents } = await this.payments.expireDue();
    const { count: expiredHolds } = await this.resourceHolds.expireDue();

    if (expiredPaymentIntents > 0 || expiredHolds > 0) {
      this.logger.log(`Expiry sweep: ${expiredPaymentIntents} payment intent(s), ${expiredHolds} hold(s)`);
    }

    return { expiredPaymentIntents, expiredHolds };
  }
}
