import { ConflictException, BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OccupancyService {
  constructor(private readonly prisma: PrismaService) {}
  async reserve(roomId: string, bookingId: string, checkIn: string, checkOut: string, status: 'HOLD' | 'CONFIRMED') {
    const dates = stayDates(checkIn, checkOut);
    try {
      return await this.prisma.$transaction((transaction) => transaction.roomOccupancy.createMany({ data: dates.map((stayDate) => ({ roomId, bookingId, stayDate, status })) }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ code: 'BOOKING_CONFLICT', message: 'Room is no longer available for the requested dates' });
      throw error;
    }
  }
}

function stayDates(checkIn: string, checkOut: string): Date[] {
  const start = new Date(`${checkIn}T00:00:00.000Z`); const end = new Date(`${checkOut}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new BadRequestException({ code: 'INVALID_STAY_RANGE', message: 'Stay range is invalid' });
  const result: Date[] = []; for (let current = start; current < end; current = new Date(current.getTime() + 86_400_000)) result.push(current); return result;
}
