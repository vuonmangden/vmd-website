import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

const transitions: Record<string, readonly string[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['CANCELLED', 'CHECKED_IN'],
  CHECKED_IN: ['CHECKED_OUT'],
};

@Injectable()
export class BbqReservationStateService {
  constructor(private readonly prisma: PrismaService) {}

  async transition(reservationId: string, toStatus: string, reason?: string) {
    return this.prisma.$transaction((tx) => this.transitionInTransaction(tx, reservationId, toStatus, reason));
  }

  async transitionInTransaction(
    tx: Prisma.TransactionClient,
    reservationId: string,
    toStatus: string,
    reason?: string,
  ) {
    const reservation = await tx.bbqReservation.findUnique({ where: { id: reservationId } });
    if (!reservation) {
      throw new NotFoundException({ code: 'BBQ_RESERVATION_NOT_FOUND', message: 'BBQ reservation not found' });
    }
    if (!transitions[reservation.status]?.includes(toStatus)) {
      throw new BadRequestException({
        code: 'INVALID_BBQ_RESERVATION_TRANSITION',
        message: 'BBQ reservation state transition is invalid',
      });
    }

    const updated = await tx.bbqReservation.update({ where: { id: reservationId }, data: { status: toStatus } });
    await tx.bbqReservationStatusHistory.create({
      data: { reservationId, fromStatus: reservation.status, toStatus, reason: reason?.trim() || null },
    });

    if (toStatus === 'CANCELLED' || toStatus === 'EXPIRED') {
      await tx.bbqReservationTable.updateMany({
        where: { reservationId, status: 'ACTIVE' },
        data: { status: 'RELEASED' },
      });
      await tx.resourceHold.updateMany({
        where: { referenceType: 'BBQ_RESERVATION', referenceId: reservationId, status: 'ACTIVE' },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
    }

    return updated;
  }
}
