import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditRecordInput {
  actorType: string;
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeData?: unknown;
  afterData?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput) {
    return this.prisma.auditLog.create({ data: {
      actorType: input.actorType, actorId: input.actorId ?? null, action: input.action,
      resourceType: input.resourceType, resourceId: input.resourceId,
      beforeData: sanitize(input.beforeData), afterData: sanitize(input.afterData), reason: input.reason?.trim() || null,
      ipAddress: input.ipAddress ?? null, userAgent: input.userAgent?.slice(0, 500) ?? null, correlationId: input.correlationId ?? null,
    } });
  }

  async list(options: { page: number; pageSize: number; action?: string; resourceType?: string }) {
    const where: Prisma.AuditLogWhereInput = {
      ...(options.action ? { action: options.action } : {}),
      ...(options.resourceType ? { resourceType: options.resourceType } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (options.page - 1) * options.pageSize, take: options.pageSize }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, page: options.page, pageSize: options.pageSize, total };
  }
}

const SENSITIVE_KEY = /password|token|otp|secret|authorization|cookie|email|phone|identity|account/i;
function sanitize(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === undefined || value === null) return Prisma.JsonNull;
  return redact(value) as Prisma.InputJsonValue;
}
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(entry)]));
  return value;
}
