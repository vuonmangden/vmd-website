import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { EmailDeliveryService } from './email/email-delivery.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { ZaloDeliveryService } from './zalo/zalo-delivery.service';
import { EmailDeliveryError } from './email/email.types';
import { ZaloDeliveryError } from './zalo/zalo.types';
import { dateLabel } from './date-label';

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 5;
const LEASE_MS = 5 * 60_000;
const RETRY_BASE_DELAY_MS = 30_000;
const RETRY_MAX_DELAY_MS = 15 * 60_000;

interface EmailPayload {
  subject: string;
  body: string;
}

interface ZaloPayload {
  templateParams: Record<string, string>;
}

/**
 * Stage B of the notification pipeline: polls `notification_jobs` for rows
 * due (`status='pending'`, `scheduledAt<=now`) and actually sends them.
 * Mirrors `OutboxProcessor`'s polling shape so a slow provider only delays
 * this loop, never the outbox drain. `NotificationInboxService` (NTF-006)
 * resets a failed job back to `pending` for retry — this loop is what
 * "picks it up", exactly as documented there.
 */
@Injectable()
export class NotificationDispatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationDispatchService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailDelivery: EmailDeliveryService,
    private readonly zaloDelivery: ZaloDeliveryService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.pollAndDispatch();
    }, POLL_INTERVAL_MS);
    this.logger.log('Notification dispatch started');
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async pollAndDispatch(): Promise<number> {
    const now = new Date();
    const jobs = await this.prisma.notificationJob.findMany({
      where: {
        OR: [
          { status: 'pending', scheduledAt: { lte: now } },
          { status: 'processing', leaseExpiresAt: { lte: now } },
        ],
      },
      orderBy: { scheduledAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (jobs.length === 0) return 0;

    let dispatched = 0;
    for (const job of jobs) {
      const claimToken = await this.claim(job.id, now);
      if (!claimToken) continue;
      const ok = await this.dispatchOne({ ...job, claimToken });
      if (ok) dispatched++;
    }

    if (dispatched > 0) {
      this.logger.log(`Dispatched ${dispatched}/${jobs.length} notification jobs`);
    }

    return dispatched;
  }

  private async dispatchOne(job: {
    id: string;
    templateCode: string;
    recipientReferenceId: string;
    email: string | null;
    phone: string | null;
    payload: unknown;
    attemptCount: number;
    claimToken: string;
  }): Promise<boolean> {
    const channel = job.templateCode.endsWith('_ZALO') ? 'zalo' : 'email';

    if (job.templateCode.includes('_REMINDER_') && !(await this.reminderStillDue(job.recipientReferenceId, job.payload))) {
      await this.settleSkipped(job);
      return false;
    }

    try {
      const result =
        channel === 'email' ? await this.sendEmail(job) : await this.sendZalo(job);

      return this.settleSuccess(job, channel, result);
    } catch (error) {
      const { code, retryable, provider, message } = normalizeError(error, channel);
      const nextAttempt = job.attemptCount + 1;

      await this.settleFailure(job, channel, {
        code,
        // A timeout or lost connection may have reached a provider. Retrying
        // is safe only when that provider deduplicates the stable job key.
        retryable: retryable && canSafelyRetry(code, provider),
        provider,
        message,
        nextAttempt,
      });

      this.logger.warn(`Notification job ${job.id} (${job.templateCode}) failed: ${message}`);
      return false;
    }
  }

  private async sendEmail(job: { id: string; email: string | null; payload: unknown }) {
    if (!job.email) throw new EmailDeliveryError('rejected', false, null);
    const payload = job.payload as EmailPayload;
    return this.emailDelivery.send({
      correlationId: job.id,
      idempotencyKey: `notification:${job.id}:email`,
      recipient: job.email,
      subject: payload.subject,
      text: payload.body,
    });
  }

  private async sendZalo(job: { id: string; phone: string | null; templateCode: string; payload: unknown }) {
    if (!job.phone) throw new ZaloDeliveryError('rejected', false, null);
    const payload = job.payload as ZaloPayload;
    return this.zaloDelivery.send({
      correlationId: job.id,
      idempotencyKey: `notification:${job.id}:zalo`,
      recipientPhone: job.phone,
      templateCode: job.templateCode,
      templateParams: payload.templateParams,
    });
  }

  /**
   * A reminder job's payload carries the check-in date it was created for
   * (`targetCheckInDate`). If the booking was cancelled, or rescheduled to a
   * different date, since the job was created, this returns false so the
   * caller skips a now-stale send — the confirmation-notification jobs
   * don't need this check, their creation-to-send window is seconds, not
   * the hours-to-days a reminder can sit pending.
   */
  private async reminderStillDue(bookingId: string, payload: unknown): Promise<boolean> {
    const targetCheckInDate = (payload as { targetCheckInDate?: string }).targetCheckInDate;
    if (!targetCheckInDate) return true;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true, checkInDate: true },
    });
    if (!booking || booking.status !== 'CONFIRMED') return false;
    return dateLabel(booking.checkInDate) === targetCheckInDate;
  }

  private async claim(jobId: string, now: Date): Promise<string | null> {
    const claimToken = randomUUID();
    const result = await this.prisma.notificationJob.updateMany({
      where: {
        id: jobId,
        OR: [
          { status: 'pending', scheduledAt: { lte: now } },
          { status: 'processing', leaseExpiresAt: { lte: now } },
        ],
      },
      data: {
        status: 'processing',
        claimToken,
        processingStartedAt: now,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      },
    });
    return result.count === 1 ? claimToken : null;
  }

  private async settleSkipped(job: { id: string; claimToken: string }): Promise<void> {
    await this.prisma.notificationJob.updateMany({
      where: { id: job.id, status: 'processing', claimToken: job.claimToken },
      data: { status: 'skipped', completedAt: new Date(), lastError: 'Booking no longer confirmed for this date — reminder skipped', claimToken: null, leaseExpiresAt: null },
    });
  }

  private async settleSuccess(
    job: { id: string; claimToken: string },
    channel: 'email' | 'zalo',
    result: { provider: string; providerMessageId: string | null },
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.notificationJob.updateMany({
        where: { id: job.id, status: 'processing', claimToken: job.claimToken },
        data: { status: 'completed', completedAt: new Date(), attemptCount: { increment: 1 }, claimToken: null, leaseExpiresAt: null },
      });
      if (updated.count !== 1) return false;
      await tx.notificationDelivery.create({
        data: { jobId: job.id, channel, provider: result.provider, providerMessageId: result.providerMessageId, status: 'sent', sentAt: new Date() },
      });
      return true;
    });
  }

  private async settleFailure(
    job: { id: string; claimToken: string },
    channel: 'email' | 'zalo',
    failure: { code: string; retryable: boolean; provider: string; message: string; nextAttempt: number },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.notificationJob.updateMany({
        where: { id: job.id, status: 'processing', claimToken: job.claimToken },
        data: {
          status: failure.retryable && failure.nextAttempt < MAX_ATTEMPTS ? 'pending' : 'failed',
          attemptCount: { increment: 1 },
          lastError: failure.message,
          claimToken: null,
          leaseExpiresAt: null,
          ...(failure.retryable && failure.nextAttempt < MAX_ATTEMPTS
            ? { scheduledAt: retryAt(failure.nextAttempt) }
            : {}),
        },
      });
      if (updated.count !== 1) return;
      await tx.notificationDelivery.create({
        data: { jobId: job.id, channel, provider: failure.provider, status: 'failed', failedAt: new Date(), responseData: { code: failure.code, retryable: failure.retryable } },
      });
    });
  }
}

function retryAt(nextAttempt: number): Date {
  const delay = Math.min(
    RETRY_BASE_DELAY_MS * 2 ** Math.max(0, nextAttempt - 1),
    RETRY_MAX_DELAY_MS,
  );
  return new Date(Date.now() + delay);
}

function normalizeError(
  error: unknown,
  channel: 'email' | 'zalo',
): { code: string; retryable: boolean; provider: string; message: string } {
  if (error instanceof EmailDeliveryError) {
    return { code: error.code, retryable: error.retryable, provider: error.provider ?? 'email', message: error.message };
  }
  if (error instanceof ZaloDeliveryError) {
    return { code: error.code, retryable: error.retryable, provider: error.provider ?? 'zalo', message: error.message };
  }
  return {
    code: 'unknown',
    retryable: true,
    provider: channel,
    message: error instanceof Error ? error.message : String(error),
  };
}

function canSafelyRetry(code: string, provider: string): boolean {
  if (code !== 'timeout' && code !== 'provider_unavailable') return true;

  // Resend documents idempotency for the email endpoint. The development
  // Mailpit adapter and the pre-production Zalo mock do not make that
  // guarantee, so an uncertain outcome is terminal for operator review.
  return provider === 'resend';
}
