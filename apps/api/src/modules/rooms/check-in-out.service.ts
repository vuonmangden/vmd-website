import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BookingStateService } from './booking-state.service';
import type { AuthenticatedActor } from '../auth/auth.types';

/** Statuses a booking must already hold before each front-desk action. */
const REQUIRED_STATUS = {
  CHECKED_IN: 'CONFIRMED',
  CHECKED_OUT: 'CHECKED_IN',
} as const;

@Injectable()
export class CheckInOutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingState: BookingStateService,
  ) {}

  checkIn(actor: AuthenticatedActor, bookingId: string, note: string | undefined, correlationId: string) {
    return this.performTransition(actor, bookingId, 'CHECKED_IN', note, correlationId);
  }

  checkOut(actor: AuthenticatedActor, bookingId: string, note: string | undefined, correlationId: string) {
    return this.performTransition(actor, bookingId, 'CHECKED_OUT', note, correlationId);
  }

  /**
   * Front-desk actions run through BookingStateService so status history is
   * written by the same code path as every other transition, and the audit row
   * shares the transaction so an unaudited check-in cannot be committed.
   */
  private async performTransition(
    actor: AuthenticatedActor,
    bookingId: string,
    toStatus: 'CHECKED_IN' | 'CHECKED_OUT',
    note: string | undefined,
    correlationId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { status: true, checkInDate: true, checkOutDate: true },
      });

      if (!booking) {
        throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
      }

      // BookingStateService rejects this too. Checking first turns a generic
      // "invalid transition" into a message the front desk can act on.
      if (booking.status !== REQUIRED_STATUS[toStatus]) {
        throw new BadRequestException({
          code: toStatus === 'CHECKED_IN' ? 'BOOKING_NOT_CHECKABLE_IN' : 'BOOKING_NOT_CHECKABLE_OUT',
          message:
            toStatus === 'CHECKED_IN'
              ? 'Only a confirmed booking can be checked in'
              : 'Only a checked-in booking can be checked out',
        });
      }

      const updated = await this.bookingState.transitionInTransaction(
        tx,
        bookingId,
        toStatus,
        note,
      );

      await tx.auditLog.create({
        data: {
          actorType: 'STAFF',
          actorId: actor.staffProfileId,
          action: toStatus === 'CHECKED_IN' ? 'booking.check_in' : 'booking.check_out',
          resourceType: 'booking',
          resourceId: bookingId,
          beforeData: { status: booking.status },
          afterData: { status: toStatus },
          reason: note?.trim() || null,
          correlationId,
        },
      });

      return { id: updated.id, status: updated.status };
    });
  }

  /**
   * Arrivals and departures for one operational date, for the front-desk
   * worklist. Dates are stored as plain dates, so the caller passes the
   * Asia/Ho_Chi_Minh operational day already resolved.
   */
  async dailyMovements(operationalDate: Date) {
    const [arrivals, departures] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: { checkInDate: operationalDate, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
        select: {
          id: true,
          bookingCode: true,
          status: true,
          adults: true,
          children: true,
          expectedArrivalTime: true,
          customer: { select: { fullName: true } },
        },
        orderBy: { bookingCode: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: { checkOutDate: operationalDate, status: { in: ['CHECKED_IN', 'CHECKED_OUT'] } },
        select: {
          id: true,
          bookingCode: true,
          status: true,
          customer: { select: { fullName: true } },
        },
        orderBy: { bookingCode: 'asc' },
      }),
    ]);

    return { date: operationalDate, arrivals, departures };
  }
}
