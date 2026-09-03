import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from '../auth/auth.types';
import type { ReconciliationOutcome } from './dto/resolve-reconciliation-case.dto';

export interface ListCasesFilter {
  status?: 'OPEN' | 'RESOLVED';
  reason?: string;
}

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ListCasesFilter) {
    const rows = await this.prisma.reconciliationCase.findMany({
      where: {
        status: filter.status ?? 'OPEN',
        ...(filter.reason ? { reason: filter.reason } : {}),
      },
      include: {
        paymentIntent: {
          select: { id: true, bookingId: true, bbqReservationId: true, amount: true, currency: true, status: true, expiresAt: true, transferContent: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serializeCase);
  }

  async findById(id: string) {
    const item = await this.prisma.reconciliationCase.findUnique({
      where: { id },
      include: {
        paymentIntent: {
          select: { id: true, bookingId: true, bbqReservationId: true, amount: true, currency: true, status: true, expiresAt: true, transferContent: true },
        },
      },
    });
    if (!item) throw new NotFoundException({ code: 'RECONCILIATION_CASE_NOT_FOUND', message: 'Reconciliation case not found' });
    return serializeCase(item);
  }

  /**
   * Manager records a manual decision (refund executed outside the system per the
   * CHB FOOD reference SOP, or a booking restored through the normal admin booking
   * flow). Deliberately does not move money or create a booking itself — Phase 1
   * policy requires every refund/restore to be a manual, audited staff action.
   */
  async resolve(actor: AuthenticatedActor, id: string, outcome: ReconciliationOutcome, note: string, correlationId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.reconciliationCase.findUnique({ where: { id }, select: { status: true } });
      if (!exists) throw new NotFoundException({ code: 'RECONCILIATION_CASE_NOT_FOUND', message: 'Reconciliation case not found' });

      const now = new Date();
      const claimed = await tx.reconciliationCase.updateMany({
        where: { id, status: 'OPEN' },
        data: { status: 'RESOLVED', resolvedAt: now, resolvedBy: actor.staffProfileId, resolutionOutcome: outcome, resolutionNote: note },
      });
      if (claimed.count !== 1) {
        throw new ConflictException({ code: 'RECONCILIATION_CASE_ALREADY_RESOLVED', message: 'Reconciliation case is already resolved' });
      }

      await tx.auditLog.create({
        data: {
          actorType: 'STAFF',
          actorId: actor.staffProfileId,
          action: 'payment.reconciliation.resolved',
          resourceType: 'RECONCILIATION_CASE',
          resourceId: id,
          beforeData: { status: exists.status },
          afterData: { status: 'RESOLVED', outcome, note },
          reason: note,
          correlationId: correlationId ?? null,
        },
      });
      const resolved = await tx.reconciliationCase.findUnique({ where: { id } });
      return resolved ? serializeCase(resolved) : null;
    });
  }
}

/**
 * Money is stored as BigInt, which `JSON.stringify` refuses to serialize —
 * and Express's `res.json` is exactly `JSON.stringify`, so returning a raw
 * row here makes the endpoint answer 500 rather than the row. Mirrors what
 * `AdminPaymentsService` already does for the same columns. Unit tests that
 * only inspect the returned object never exercise this, so the companion
 * spec serializes the result the way the HTTP layer does.
 */
function serializeCase<T extends { expectedAmount: bigint; receivedAmount: bigint; paymentIntent?: { amount: bigint } | null }>(row: T) {
  return {
    ...row,
    expectedAmount: row.expectedAmount.toString(),
    receivedAmount: row.receivedAmount.toString(),
    ...(row.paymentIntent ? { paymentIntent: { ...row.paymentIntent, amount: row.paymentIntent.amount.toString() } } : {}),
  };
}
