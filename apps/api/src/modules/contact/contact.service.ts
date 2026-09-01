import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from '../auth/auth.types';
import { hashIp } from './contact-rate-limit.service';

export const CONTACT_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

/** Roles allowed to read and triage contact submissions. */
const CONTACT_READ_ROLES: readonly string[] = ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'MARKETING'];

export interface CreateContactSubmissionInput {
  fullName: string;
  email?: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface ContactSubmissionSummary {
  id: string;
  fullName: string;
  emailMasked: string | null;
  phoneMasked: string | null;
  subject: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public submission. Returns only the id — echoing stored content back would
   * let the endpoint be used to confirm what was persisted.
   */
  async submit(
    input: CreateContactSubmissionInput,
    ipAddress: string | undefined,
    correlationId: string | null,
  ): Promise<{ id: string }> {
    const email = input.email?.trim().toLowerCase() || null;
    const phone = input.phone?.trim() || null;

    // The database enforces this too; checking here returns a useful 400
    // instead of surfacing a constraint violation.
    if (!email && !phone) {
      throw new BadRequestException({
        code: 'CONTACT_CHANNEL_REQUIRED',
        message: 'Either email or phone is required',
      });
    }

    const created = await this.prisma.contactSubmission.create({
      data: {
        fullName: input.fullName.trim(),
        email,
        phone,
        subject: input.subject.trim(),
        message: input.message.trim(),
        status: 'NEW',
        ipHash: hashIp(ipAddress),
        correlationId: isUuid(correlationId) ? correlationId : null,
      },
      select: { id: true },
    });

    return { id: created.id };
  }

  async list(
    actor: AuthenticatedActor,
    options: { status?: string; page: number; pageSize: number },
  ): Promise<{ items: ContactSubmissionSummary[]; page: number; pageSize: number; total: number }> {
    assertCanRead(actor);

    if (options.status && !isContactStatus(options.status)) {
      throw new BadRequestException({
        code: 'CONTACT_STATUS_INVALID',
        message: 'Unknown status filter',
      });
    }

    const where = options.status ? { status: options.status } : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contactSubmission.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          subject: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.contactSubmission.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        emailMasked: maskEmail(row.email),
        phoneMasked: maskPhone(row.phone),
        subject: row.subject,
        status: row.status,
        createdAt: row.createdAt,
      })),
      page: options.page,
      pageSize: options.pageSize,
      total,
    };
  }

  async updateStatus(
    actor: AuthenticatedActor,
    id: string,
    status: string,
    internalNote: string | undefined,
    correlationId: string,
  ): Promise<{ id: string; status: string }> {
    assertCanRead(actor);

    if (!isContactStatus(status)) {
      throw new BadRequestException({
        code: 'CONTACT_STATUS_INVALID',
        message: 'Unknown status',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.contactSubmission.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!existing) {
        throw new NotFoundException({
          code: 'CONTACT_SUBMISSION_NOT_FOUND',
          message: 'Contact submission not found',
        });
      }

      const updated = await tx.contactSubmission.update({
        where: { id },
        data: {
          status,
          internalNote: internalNote?.trim() ?? undefined,
          handledBy: actor.staffProfileId,
          handledAt: new Date(),
        },
        select: { id: true, status: true },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'STAFF',
          actorId: actor.staffProfileId,
          action: 'contact.status.updated',
          resourceType: 'contact_submission',
          resourceId: id,
          beforeData: { status: existing.status },
          afterData: { status },
          correlationId,
        },
      });

      return updated;
    });
  }
}

function assertCanRead(actor: AuthenticatedActor): void {
  if (!actor.roles.some((role) => CONTACT_READ_ROLES.includes(role))) {
    throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Permission denied' });
  }
}

function isContactStatus(value: string): value is ContactStatus {
  return (CONTACT_STATUSES as readonly string[]).includes(value);
}

function isUuid(value: string | null): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/** §35.5 forbids exposing full contact details in listings. */
export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain || !local) return '***';
  const head = local.slice(0, Math.min(3, local.length));
  return `${head}***@${domain}`;
}

export function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.length <= 4 ? '****' : `****${phone.slice(-4)}`;
}
