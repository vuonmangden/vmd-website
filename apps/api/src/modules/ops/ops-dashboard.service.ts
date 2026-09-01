import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

const OCCUPANCY_WINDOW_DAYS = 7;

export interface OccupancyDay {
  date: string;
  occupiedRooms: number;
  totalRooms: number;
  occupancyRate: number;
}

export interface OpsDashboard {
  date: string;
  bookings: {
    arrivalsToday: number;
    checkedInToday: number;
    departuresToday: number;
    checkedOutToday: number;
    pendingPayment: number;
    unconfirmedArrivalsToday: number;
  };
  bbq: {
    reservationsToday: number;
  };
  payments: {
    reconciliationOpen: number;
    revenueToday: string;
    depositsCollectedTotal: string;
  };
  occupancy: OccupancyDay[];
  notifications: {
    failed: number;
  };
  contact: {
    unhandled: number;
  };
}

@Injectable()
export class OpsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(operationalDate: Date): Promise<OpsDashboard> {
    const dateLabel = operationalDate.toISOString().slice(0, 10);
    const dayStart = new Date(`${dateLabel}T00:00:00.000+07:00`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const windowEnd = new Date(
      operationalDate.getTime() + OCCUPANCY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const [
      arrivals,
      departures,
      reservationsToday,
      pendingPayment,
      unconfirmedArrivalsToday,
      reconciliationOpen,
      revenueTodaySum,
      depositsCollectedSum,
      notificationsFailed,
      contactUnhandled,
      totalRooms,
      occupancyRows,
    ] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: { checkInDate: operationalDate, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
        select: { status: true },
      }),
      this.prisma.booking.findMany({
        where: { checkOutDate: operationalDate, status: { in: ['CHECKED_IN', 'CHECKED_OUT'] } },
        select: { status: true },
      }),
      this.prisma.bbqReservation.count({
        where: {
          reservationDate: operationalDate,
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
        },
      }),
      this.prisma.booking.count({ where: { status: 'PENDING_PAYMENT' } }),
      this.prisma.booking.count({
        where: { status: 'PENDING_PAYMENT', checkInDate: operationalDate },
      }),
      this.prisma.reconciliationCase.count({ where: { status: 'OPEN' } }),
      this.prisma.paymentIntent.aggregate({
        where: { status: 'PAID', updatedAt: { gte: dayStart, lt: dayEnd } },
        _sum: { paidAmount: true },
      }),
      this.prisma.paymentIntent.aggregate({
        where: { status: 'PAID' },
        _sum: { paidAmount: true },
      }),
      this.prisma.notificationJob.count({ where: { status: 'failed' } }),
      this.prisma.contactSubmission.count({ where: { status: 'NEW' } }),
      this.prisma.room.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.roomOccupancy.groupBy({
        by: ['stayDate'],
        where: { stayDate: { gte: operationalDate, lt: windowEnd } },
        _count: { _all: true },
      }),
    ]);

    const occupiedByDate = new Map(
      occupancyRows.map((row) => [row.stayDate.toISOString().slice(0, 10), row._count._all]),
    );

    const occupancy: OccupancyDay[] = Array.from({ length: OCCUPANCY_WINDOW_DAYS }, (_, offset) => {
      const day = new Date(operationalDate.getTime() + offset * 24 * 60 * 60 * 1000);
      const key = day.toISOString().slice(0, 10);
      const occupiedRooms = occupiedByDate.get(key) ?? 0;

      return {
        date: key,
        occupiedRooms,
        totalRooms,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 10000) / 100 : 0,
      };
    });

    return {
      date: dateLabel,
      bookings: {
        arrivalsToday: arrivals.length,
        checkedInToday: arrivals.filter((row) => row.status === 'CHECKED_IN').length,
        departuresToday: departures.length,
        checkedOutToday: departures.filter((row) => row.status === 'CHECKED_OUT').length,
        pendingPayment,
        unconfirmedArrivalsToday,
      },
      bbq: { reservationsToday },
      payments: {
        reconciliationOpen,
        revenueToday: (revenueTodaySum._sum.paidAmount ?? 0n).toString(),
        depositsCollectedTotal: (depositsCollectedSum._sum.paidAmount ?? 0n).toString(),
      },
      occupancy,
      notifications: { failed: notificationsFailed },
      contact: { unhandled: contactUnhandled },
    };
  }
}
