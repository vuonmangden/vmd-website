import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

const transitions: Record<string, readonly string[]> = { DRAFT: ['PENDING_PAYMENT'], PENDING_PAYMENT: ['EXPIRED'], CONFIRMED: ['MODIFIED', 'CANCELLED', 'CHECKED_IN'], MODIFIED: ['CONFIRMED'], CHECKED_IN: ['CHECKED_OUT'] };
@Injectable()
export class BookingStateService {
  constructor(private readonly prisma: PrismaService) {}
  async transition(bookingId: string, toStatus: string, reason?: string) {
    return this.prisma.$transaction((tx) => this.transitionInTransaction(tx, bookingId, toStatus, reason));
  }

  async transitionInTransaction(tx: Prisma.TransactionClient, bookingId: string, toStatus: string, reason?: string) {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } }); if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    if (!transitions[booking.status]?.includes(toStatus)) throw new BadRequestException({ code: 'INVALID_BOOKING_TRANSITION', message: 'Booking state transition is invalid' });
    const updated = await tx.booking.update({ where: { id: bookingId }, data: { status: toStatus } });
    await tx.bookingStatusHistory.create({ data: { bookingId, fromStatus: booking.status, toStatus, reason: reason?.trim() || null } });
    if (toStatus === 'CANCELLED' || toStatus === 'EXPIRED') { await tx.roomOccupancy.deleteMany({ where: { bookingId } }); await tx.resourceHold.updateMany({ where: { referenceType: 'BOOKING', referenceId: bookingId, status: 'ACTIVE' }, data: { status: 'RELEASED', releasedAt: new Date() } }); }
    return updated;
  }
}
