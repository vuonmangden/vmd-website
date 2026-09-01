import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from '../auth/auth.types';

/** Job states an operator may see in the failure inbox. */
const INBOX_STATUSES = ['failed', 'pending', 'processing'] as const;

/** A job may only be retried from a terminal failure. */
const RETRYABLE_STATUS = 'failed';

export interface ListFailuresOptions {
  status?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class NotificationInboxService {
  constructor(private readonly prisma: PrismaService) {}

  async list(options: ListFailuresOptions) {
    if (options.status && !(INBOX_STATUSES as readonly string[]).includes(options.status)) {
      throw new BadRequestException({
        code: 'NOTIFICATION_STATUS_INVALID',
        message: 'Unknown status filter',
      });
    }

    const where = { status: options.status ?? RETRYABLE_STATUS };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notificationJob.findMany({
        where,
        select: {
          id: true,
          templateCode: true,
          recipientType: true,
          recipientReferenceId: true,
          email: true,
          phone: true,
          status: true,
          attemptCount: true,
          lastError: true,
          scheduledAt: true,
          createdAt: true,
          completedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.notificationJob.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        templateCode: row.templateCode,
        recipientType: row.recipientType,
        recipientReferenceId: row.recipientReferenceId,
        // §35.5: the inbox shows enough to identify a delivery without
        // exposing the full address.
        emailMasked: maskEmail(row.email),
        phoneMasked: maskPhone(row.phone),
        status: row.status,
        attemptCount: row.attemptCount,
        lastError: row.lastError,
        scheduledAt: row.scheduledAt,
        createdAt: row.createdAt,
        completedAt: row.completedAt,
      })),
      page: options.page,
      pageSize: options.pageSize,
      total,
    };
  }

  /**
   * Requeues a failed job by resetting it to pending; the existing outbox
   * poller picks it up. The attempt counter is deliberately preserved so a
   * job cannot be retried forever without that being visible.
   *
   * The audit row shares the transaction — a retry sends a real message to a
   * guest, so it must never happen unaudited (AGENTS.md §12).
   */
  async retry(actor: AuthenticatedActor, jobId: string, correlationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.notificationJob.findUnique({
        where: { id: jobId },
        select: { status: true, attemptCount: true },
      });

      if (!job) {
        throw new NotFoundException({
          code: 'NOTIFICATION_JOB_NOT_FOUND',
          message: 'Notification job not found',
        });
      }

      if (job.status !== RETRYABLE_STATUS) {
        throw new BadRequestException({
          code: 'NOTIFICATION_JOB_NOT_RETRYABLE',
          message: 'Only a failed notification job can be retried',
        });
      }

      const updated = await tx.notificationJob.update({
        where: { id: jobId },
        data: { status: 'pending', lastError: null },
        select: { id: true, status: true, attemptCount: true },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'STAFF',
          actorId: actor.staffProfileId,
          action: 'notification.retry',
          resourceType: 'notification_job',
          resourceId: jobId,
          beforeData: { status: job.status, attemptCount: job.attemptCount },
          afterData: { status: 'pending' },
          correlationId,
        },
      });

      return updated;
    });
  }
}

export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain || !local) return '***';
  return `${local.slice(0, Math.min(3, local.length))}***@${domain}`;
}

export function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.length <= 4 ? '****' : `****${phone.slice(-4)}`;
}
