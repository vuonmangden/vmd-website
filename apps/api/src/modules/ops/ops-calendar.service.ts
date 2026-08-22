import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

export interface CalendarRange {
  from: Date;
  to: Date;
  roomId?: string;
}

@Injectable()
export class OpsCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Raw placements for a date range so the admin UI can render day, week,
   * month, or by-room views without a separate endpoint per mode — the shape
   * (rooms + bookings + room blocks + BBQ reservations, each carrying its own
   * status) already has everything §32.2's colour legend needs.
   *
   * Bookings and BBQ reservations are returned regardless of status,
   * including CANCELLED — a cancelled stay still occupied the range it was
   * booked for and the calendar shows that with the "Hủy" colour, unlike
   * `RoomOccupancy`, which is deleted on cancel and would hide it.
   */
  async range({ from, to, roomId }: CalendarRange) {
    const [rooms, bookings, roomBlocks, bbqReservations] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where: { deletedAt: null, ...(roomId ? { id: roomId } : {}) },
        select: { id: true, code: true, name: true, roomTypeId: true, areaZone: true, status: true },
        orderBy: [{ areaZone: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.booking.findMany({
        where: {
          checkInDate: { lt: to },
          checkOutDate: { gt: from },
          ...(roomId ? { rooms: { some: { roomId } } } : {}),
        },
        select: {
          id: true,
          bookingCode: true,
          status: true,
          checkInDate: true,
          checkOutDate: true,
          customer: { select: { fullName: true } },
          rooms: { select: { roomId: true } },
        },
        orderBy: { checkInDate: 'asc' },
      }),
      this.prisma.roomBlock.findMany({
        where: {
          cancelledAt: null,
          startDate: { lt: to },
          endDate: { gt: from },
          ...(roomId ? { roomId } : {}),
        },
        select: { id: true, roomId: true, startDate: true, endDate: true, reason: true, blockType: true },
        orderBy: { startDate: 'asc' },
      }),
      this.prisma.bbqReservation.findMany({
        where: { reservationDate: { gte: from, lt: to } },
        select: {
          id: true,
          reservationCode: true,
          status: true,
          reservationDate: true,
          startTime: true,
          endTime: true,
          tables: { select: { tableId: true, areaId: true } },
        },
        orderBy: { reservationDate: 'asc' },
      }),
    ]);

    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      rooms,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        bookingCode: booking.bookingCode,
        status: booking.status,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        customerName: booking.customer.fullName,
        roomIds: booking.rooms.map((row) => row.roomId),
      })),
      roomBlocks,
      bbqReservations: bbqReservations.map((reservation) => ({
        id: reservation.id,
        reservationCode: reservation.reservationCode,
        status: reservation.status,
        reservationDate: reservation.reservationDate,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        tableIds: reservation.tables.map((row) => row.tableId),
      })),
    };
  }
}
