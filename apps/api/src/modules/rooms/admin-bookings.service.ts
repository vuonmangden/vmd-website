import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BookingStateService } from './booking-state.service';
import type { AuthenticatedActor } from '../auth/auth.types';

/** Statuses an admin may drive a booking into from BKG-008. */
const ADMIN_TRANSITIONS = ['CONFIRMED', 'CANCELLED', 'MODIFIED'] as const;
export type AdminTransition = (typeof ADMIN_TRANSITIONS)[number];

export interface ListBookingsOptions {
  status?: string;
  checkInFrom?: Date;
  checkInTo?: Date;
  page: number;
  pageSize: number;
}

@Injectable()
export class AdminBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingState: BookingStateService,
  ) {}

  async list(options: ListBookingsOptions) {
    const where: Record<string, unknown> = {};
    if (options.status) where['status'] = options.status;

    if (options.checkInFrom || options.checkInTo) {
      where['checkInDate'] = {
        ...(options.checkInFrom ? { gte: options.checkInFrom } : {}),
        ...(options.checkInTo ? { lte: options.checkInTo } : {}),
      };
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        select: {
          id: true,
          bookingCode: true,
          status: true,
          checkInDate: true,
          checkOutDate: true,
          adults: true,
          children: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          customer: { select: { id: true, fullName: true } },
        },
        orderBy: { checkInDate: 'asc' },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        ...row,
        // BigInt is not JSON-serialisable; money stays an integer string.
        totalAmount: row.totalAmount.toString(),
      })),
      page: options.page,
      pageSize: options.pageSize,
      total,
    };
  }

  async detail(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingCode: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        adults: true,
        children: true,
        totalAmount: true,
        currency: true,
        specialRequest: true,
        expectedArrivalTime: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: { id: true, fullName: true, customerCode: true } },
        rooms: true,
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });

    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    }

    return { ...booking, totalAmount: booking.totalAmount.toString() };
  }

  /**
   * Drives a booking through BookingStateService so the transition table and
   * status history stay the single source of truth (AGENTS.md §8: controllers
   * never write status directly). The audit row shares the transaction, so an
   * unaudited status change cannot be committed.
   */
  async transition(
    actor: AuthenticatedActor,
    bookingId: string,
    toStatus: string,
    reason: string | undefined,
    correlationId: string,
  ) {
    if (!(ADMIN_TRANSITIONS as readonly string[]).includes(toStatus)) {
      throw new BadRequestException({
        code: 'BOOKING_TRANSITION_NOT_ALLOWED',
        message: 'This transition is not available from the admin booking API',
      });
    }

    if (toStatus === 'CANCELLED' && !reason?.trim()) {
      // Cancelling releases occupancy and may involve money, so it must carry
      // a reason for the audit trail.
      throw new BadRequestException({
        code: 'BOOKING_CANCEL_REASON_REQUIRED',
        message: 'A reason is required to cancel a booking',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { status: true },
      });
      if (!before) {
        throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
      }

      const updated = await this.bookingState.transitionInTransaction(
        tx,
        bookingId,
        toStatus,
        reason,
      );

      await tx.auditLog.create({
        data: {
          actorType: 'STAFF',
          actorId: actor.staffProfileId,
          action: `booking.${toStatus.toLowerCase()}`,
          resourceType: 'booking',
          resourceId: bookingId,
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
