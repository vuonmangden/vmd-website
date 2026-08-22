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

  list(filter: ListCasesFilter) {
    return this.prisma.reconciliationCase.findMany({
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
    return item;
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
      return tx.reconciliationCase.findUnique({ where: { id } });
    });
  }
}
