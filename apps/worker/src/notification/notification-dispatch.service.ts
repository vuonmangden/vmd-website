import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { EmailDeliveryService } from './email/email-delivery.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { ZaloDeliveryService } from './zalo/zalo-delivery.service';
import { EmailDeliveryError } from './email/email.types';
import { ZaloDeliveryError } from './zalo/zalo.types';

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 4;

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
    const jobs = await this.prisma.notificationJob.findMany({
      where: { status: 'pending', scheduledAt: { lte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (jobs.length === 0) return 0;

    let dispatched = 0;
    for (const job of jobs) {
      const ok = await this.dispatchOne(job);
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
    email: string | null;
    phone: string | null;
    payload: unknown;
    attemptCount: number;
  }): Promise<boolean> {
    const channel = job.templateCode.endsWith('_ZALO') ? 'zalo' : 'email';

    try {
      const result =
        channel === 'email' ? await this.sendEmail(job) : await this.sendZalo(job);

      await this.prisma.$transaction([
        this.prisma.notificationDelivery.create({
          data: {
            jobId: job.id,
            channel,
            provider: result.provider,
            providerMessageId: result.providerMessageId,
            status: 'sent',
            sentAt: new Date(),
          },
        }),
        this.prisma.notificationJob.update({
          where: { id: job.id },
          data: { status: 'completed', completedAt: new Date(), attemptCount: { increment: 1 } },
        }),
      ]);
      return true;
    } catch (error) {
      const { code, retryable, provider, message } = normalizeError(error, channel);
      const nextAttempt = job.attemptCount + 1;

      await this.prisma.$transaction([
        this.prisma.notificationDelivery.create({
          data: {
            jobId: job.id,
            channel,
            provider,
            status: 'failed',
            failedAt: new Date(),
            responseData: { code, retryable },
          },
        }),
        this.prisma.notificationJob.update({
          where: { id: job.id },
          data: {
            status: retryable && nextAttempt < MAX_ATTEMPTS ? 'pending' : 'failed',
            attemptCount: { increment: 1 },
            lastError: message,
          },
        }),
      ]);

      this.logger.warn(`Notification job ${job.id} (${job.templateCode}) failed: ${message}`);
      return false;
    }
  }

  private async sendEmail(job: { id: string; email: string | null; payload: unknown }) {
    if (!job.email) throw new EmailDeliveryError('rejected', false, null);
    const payload = job.payload as EmailPayload;
    return this.emailDelivery.send({
      correlationId: job.id,
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
      recipientPhone: job.phone,
      templateCode: job.templateCode,
      templateParams: payload.templateParams,
    });
  }
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
