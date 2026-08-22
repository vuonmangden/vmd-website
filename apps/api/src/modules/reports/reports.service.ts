import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

export interface ReportRange {
  from: Date;
  to: Date;
}

/** Reservation/booking statuses that represent an actually-confirmed sale, for revenue sums. */
const CONFIRMED_STATUSES = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Booking volume created in the period, by status and by acquisition source (§39.3). */
  async bookings(range: ReportRange) {
    const { start, end } = instantRange(range);
    const rows = await this.prisma.booking.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { status: true, source: true },
    });

    return {
      from: label(range.from),
      to: label(range.to),
      total: rows.length,
      byStatus: tally(rows.map((row) => row.status)),
      bySource: tally(rows.map((row) => row.source)),
    };
  }

  /**
   * Revenue for the period (§39.2). `roomRevenue`/`bbqRevenue`/`totalCollected`
   * are scoped to when a payment was actually confirmed in the period;
   * `totalBookingValue`/`outstandingBalance` are scoped to bookings created in
   * the period — two different, individually well-defined lenses that will
   * not reconcile to each other by construction (a payment confirmed in the
   * period can belong to a booking created outside it, and vice versa).
   * `discount` is always zero — no voucher/discount system exists yet.
   */
  async revenue(range: ReportRange) {
    const { start, end } = instantRange(range);
    const [roomPaid, bbqPaid, bookingsCreated] = await this.prisma.$transaction([
      this.prisma.paymentIntent.aggregate({
        where: { status: 'PAID', updatedAt: { gte: start, lt: end }, bookingId: { not: null } },
        _sum: { paidAmount: true },
      }),
      this.prisma.paymentIntent.aggregate({
        where: { status: 'PAID', updatedAt: { gte: start, lt: end }, bbqReservationId: { not: null } },
        _sum: { paidAmount: true },
      }),
      this.prisma.booking.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { totalAmount: true, paymentIntents: { where: { status: 'PAID' }, select: { paidAmount: true } } },
      }),
    ]);

    const roomRevenue = roomPaid._sum.paidAmount ?? 0n;
    const bbqRevenue = bbqPaid._sum.paidAmount ?? 0n;
    const totalBookingValue = bookingsCreated.reduce((sum, booking) => sum + booking.totalAmount, 0n);
    const bookingsPaid = bookingsCreated.reduce(
      (sum, booking) => sum + booking.paymentIntents.reduce((s, intent) => s + intent.paidAmount, 0n),
      0n,
    );
    const outstandingBalance = totalBookingValue > bookingsPaid ? totalBookingValue - bookingsPaid : 0n;

    return {
      from: label(range.from),
      to: label(range.to),
      roomRevenue: roomRevenue.toString(),
      bbqRevenue: bbqRevenue.toString(),
      totalCollected: (roomRevenue + bbqRevenue).toString(),
      totalBookingValue: totalBookingValue.toString(),
      outstandingBalance: outstandingBalance.toString(),
      discount: '0',
    };
  }

  /**
   * Occupied / available room-nights per day (§39.1's exact formula).
   * Available room-nights exclude inactive rooms and rooms under an active
   * `RoomBlock` (maintenance) for that day; occupied room-nights come from
   * `RoomOccupancy`, which already excludes cancelled bookings and expired
   * holds (those rows are deleted by `BookingStateService` on transition).
   */
  async occupancy(range: ReportRange) {
    const [totalActiveRooms, blocks, occupancyRows] = await this.prisma.$transaction([
      this.prisma.room.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.roomBlock.findMany({
        where: { cancelledAt: null, startDate: { lt: range.to }, endDate: { gt: range.from } },
        select: { roomId: true, startDate: true, endDate: true },
      }),
      this.prisma.roomOccupancy.groupBy({
        by: ['stayDate'],
        where: { stayDate: { gte: range.from, lt: range.to } },
        _count: { _all: true },
      }),
    ]);

    const occupiedByDate = new Map(occupancyRows.map((row) => [label(row.stayDate), row._count._all]));
    const days: Array<{ date: string; occupiedRooms: number; availableRooms: number; occupancyRate: number }> = [];

    for (let time = range.from.getTime(); time < range.to.getTime(); time += 24 * 60 * 60 * 1000) {
      const day = new Date(time);
      const blockedRooms = new Set(
        blocks.filter((block) => block.startDate <= day && day < block.endDate).map((block) => block.roomId),
      ).size;
      const availableRooms = Math.max(totalActiveRooms - blockedRooms, 0);
      const occupiedRooms = occupiedByDate.get(label(day)) ?? 0;

      days.push({
        date: label(day),
        occupiedRooms,
        availableRooms,
        occupancyRate: availableRooms > 0 ? Math.round((occupiedRooms / availableRooms) * 10000) / 100 : 0,
      });
    }

    return { from: label(range.from), to: label(range.to), days };
  }

  /** BBQ reservation volume by status; item/deposit revenue counted only for confirmed-or-later reservations. */
  async bbq(range: ReportRange) {
    const rows = await this.prisma.bbqReservation.findMany({
      where: { reservationDate: { gte: range.from, lt: range.to } },
      select: { status: true, itemsAmount: true, depositAmount: true },
    });

    const confirmed = rows.filter((row) => CONFIRMED_STATUSES.includes(row.status));

    return {
      from: label(range.from),
      to: label(range.to),
      total: rows.length,
      byStatus: tally(rows.map((row) => row.status)),
      itemsRevenue: confirmed.reduce((sum, row) => sum + row.itemsAmount, 0n).toString(),
      depositRevenue: confirmed.reduce((sum, row) => sum + row.depositAmount, 0n).toString(),
    };
  }

  /** Payment intent volume by status, and reconciliation case volume by status/reason, created in the period. */
  async payments(range: ReportRange) {
    const { start, end } = instantRange(range);
    const [intents, cases] = await this.prisma.$transaction([
      this.prisma.paymentIntent.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { status: true } }),
      this.prisma.reconciliationCase.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { status: true, reason: true } }),
    ]);

    return {
      from: label(range.from),
      to: label(range.to),
      paymentsByStatus: tally(intents.map((row) => row.status)),
      reconciliationByStatus: tally(cases.map((row) => row.status)),
      reconciliationByReason: tally(cases.map((row) => row.reason)),
    };
  }
}

function label(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Converts an operational date-label range to Asia/Ho_Chi_Minh instant boundaries, for querying timestamptz columns. */
function instantRange(range: ReportRange): { start: Date; end: Date } {
  return {
    start: new Date(`${label(range.from)}T00:00:00.000+07:00`),
    end: new Date(`${label(range.to)}T00:00:00.000+07:00`),
  };
}

function tally(values: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}
