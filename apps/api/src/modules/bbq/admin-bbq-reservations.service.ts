import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BbqReservationStateService } from './bbq-reservation-state.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const ADMIN_TRANSITIONS = ['CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT'] as const;
export type AdminBbqTransition = (typeof ADMIN_TRANSITIONS)[number];

export interface ListBbqReservationsOptions {
  status?: string;
  reservationDateFrom?: Date;
  reservationDateTo?: Date;
  page: number;
  pageSize: number;
}

@Injectable()
export class AdminBbqReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationState: BbqReservationStateService,
  ) {}

  async list(options: ListBbqReservationsOptions) {
    const where: Record<string, unknown> = {};
    if (options.status) where['status'] = options.status;
    if (options.reservationDateFrom || options.reservationDateTo) {
      where['reservationDate'] = {
        ...(options.reservationDateFrom ? { gte: options.reservationDateFrom } : {}),
        ...(options.reservationDateTo ? { lte: options.reservationDateTo } : {}),
      };
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bbqReservation.findMany({
        where,
        select: {
          id: true,
          reservationCode: true,
          status: true,
          reservationDate: true,
          startTime: true,
          endTime: true,
          adults: true,
          children: true,
          itemsAmount: true,
          depositAmount: true,
          currency: true,
          createdAt: true,
          customer: { select: { id: true, fullName: true } },
          tables: { where: { status: 'ACTIVE' }, select: { table: { select: { code: true, name: true } } } },
        },
        orderBy: { reservationDate: 'asc' },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.bbqReservation.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        ...row,
        itemsAmount: row.itemsAmount.toString(),
        depositAmount: row.depositAmount.toString(),
        tables: row.tables.map((t) => t.table),
      })),
      page: options.page,
      pageSize: options.pageSize,
      total,
    };
  }

  /**
   * One operational date's reservations for the front-desk/calendar view.
   * Unlike rooms, a BBQ reservation is a single-day time window rather than
   * a multi-night stay, so there is no separate arrivals/departures split —
   * one list per date, ordered by start time, is enough.
   */
  async calendar(reservationDate: Date) {
    const reservations = await this.prisma.bbqReservation.findMany({
      where: { reservationDate, status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] } },
      select: {
        id: true,
        reservationCode: true,
        status: true,
        startTime: true,
        endTime: true,
        adults: true,
        children: true,
        customer: { select: { fullName: true } },
        tables: { where: { status: 'ACTIVE' }, select: { table: { select: { code: true, name: true } }, area: { select: { name: true } } } },
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      date: reservationDate,
      reservations: reservations.map((reservation) => ({ ...reservation, tables: reservation.tables.map((t) => ({ ...t.table, areaName: t.area.name })) })),
    };
  }

  async detail(reservationId: string) {
    const reservation = await this.prisma.bbqReservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        reservationCode: true,
        status: true,
        reservationDate: true,
        startTime: true,
        endTime: true,
        adults: true,
        children: true,
        itemsAmount: true,
        depositAmount: true,
        currency: true,
        specialRequest: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: { id: true, fullName: true, customerCode: true } },
        tables: { select: { table: { select: { id: true, code: true, name: true } }, area: { select: { id: true, code: true, name: true } }, status: true, startAt: true, endAt: true } },
        items: { orderBy: { createdAt: 'asc' } },
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });

    if (!reservation) {
      throw new NotFoundException({ code: 'BBQ_RESERVATION_NOT_FOUND', message: 'BBQ reservation not found' });
    }

    return {
      ...reservation,
      itemsAmount: reservation.itemsAmount.toString(),
      depositAmount: reservation.depositAmount.toString(),
      items: reservation.items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
    };
  }

  /**
   * Drives a reservation through BbqReservationStateService so the transition
   * table and status history stay the single source of truth, mirroring how
   * AdminBookingsService.transition delegates to BookingStateService.
   */
  async transition(
    actor: AuthenticatedActor,
    reservationId: string,
    toStatus: string,
    reason: string | undefined,
    correlationId: string,
  ) {
    if (!(ADMIN_TRANSITIONS as readonly string[]).includes(toStatus)) {
      throw new BadRequestException({
        code: 'BBQ_RESERVATION_TRANSITION_NOT_ALLOWED',
        message: 'This transition is not available from the admin BBQ reservation API',
      });
    }
    if (toStatus === 'CANCELLED' && !reason?.trim()) {
      throw new BadRequestException({
        code: 'BBQ_RESERVATION_CANCEL_REASON_REQUIRED',
        message: 'A reason is required to cancel a BBQ reservation',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.bbqReservation.findUnique({ where: { id: reservationId }, select: { status: true } });
      if (!before) throw new NotFoundException({ code: 'BBQ_RESERVATION_NOT_FOUND', message: 'BBQ reservation not found' });

      const updated = await this.reservationState.transitionInTransaction(tx, reservationId, toStatus, reason);

      await tx.auditLog.create({
        data: {
          actorType: 'STAFF',
          actorId: actor.staffProfileId,
          action: `bbq_reservation.${toStatus.toLowerCase()}`,
          resourceType: 'bbq_reservation',
          resourceId: reservationId,
          beforeData: { status: before.status },
          afterData: { status: toStatus },
          reason: reason?.trim() || null,
          correlationId,
        },
      });

      return { id: updated.id, status: updated.status };
    });
  }
}
