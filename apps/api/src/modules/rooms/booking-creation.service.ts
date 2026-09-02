import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateSandboxBooking { customerId: string; roomId: string; roomTypeId: string; checkIn: string; checkOut: string; adults: number; children: number; totalAmount: bigint; nightlyRateSnapshot: Prisma.InputJsonValue; idempotencyKey: string; }
@Injectable()
export class BookingCreationService {
  constructor(private readonly prisma: PrismaService) {}
  async create(input: CreateSandboxBooking) {
    const dates = stayDates(input.checkIn, input.checkOut); if (input.adults < 1 || input.children < 0 || input.totalAmount < 0n || !input.idempotencyKey.trim()) throw invalidBooking();
    const requestHash = createHash('sha256').update(JSON.stringify({ ...input, totalAmount: input.totalAmount.toString() })).digest('hex');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const previous = await tx.idempotencyKey.findUnique({ where: { key: input.idempotencyKey } });
        if (previous?.responseBody) return previous.responseBody;
        const checkInDate = dates[0]!; const checkOutDate = new Date(dates.at(-1)!.getTime() + 86_400_000);
        const booking = await tx.booking.create({ data: { bookingCode: `SYN-${randomUUID().slice(0, 8).toUpperCase()}`, customerId: input.customerId, checkInDate, checkOutDate, adults: input.adults, children: input.children, status: 'PENDING_PAYMENT', source: 'SYNTHETIC', totalAmount: input.totalAmount } });
        await tx.bookingRoom.create({ data: { bookingId: booking.id, roomId: input.roomId, roomTypeId: input.roomTypeId, nightlyRateSnapshot: input.nightlyRateSnapshot, amount: input.totalAmount, adults: input.adults, children: input.children } });
        await tx.roomOccupancy.createMany({ data: dates.map((stayDate) => ({ roomId: input.roomId, bookingId: booking.id, stayDate, status: 'HOLD' })) });
        const expiresAt = new Date(Date.now() + holdMinutes() * 60_000);
        await tx.resourceHold.create({ data: { resourceType: 'ROOM', resourceId: input.roomId, referenceType: 'BOOKING', referenceId: booking.id, startAt: checkInDate, endAt: booking.checkOutDate, expiresAt, status: 'ACTIVE', idempotencyKey: `booking:${input.idempotencyKey}` } });
        const response = { bookingId: booking.id, bookingCode: booking.bookingCode, status: booking.status };
        await tx.idempotencyKey.create({ data: { key: input.idempotencyKey, scope: 'booking.create.sandbox', requestHash, responseStatus: 201, responseBody: response, expiresAt: new Date(Date.now() + 86_400_000) } });
        await tx.outboxEvent.create({ data: { aggregateType: 'BOOKING', aggregateId: booking.id, eventType: 'booking.created.sandbox', payload: response } });
        return response;
      });
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ code: 'BOOKING_CONFLICT', message: 'Room is no longer available' }); throw error; }
  }
}
function stayDates(checkIn: string, checkOut: string): Date[] { const start = new Date(`${checkIn}T00:00:00.000Z`); const end = new Date(`${checkOut}T00:00:00.000Z`); if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw invalidBooking(); const values: Date[]=[]; for(let current=start; current<end;current=new Date(current.getTime()+86_400_000)) values.push(current); return values; }
function holdMinutes(): number { const value=Number.parseInt(process.env['BOOKING_HOLD_MINUTES'] ?? '30',10); return Number.isInteger(value)&&value>0&&value<=360?value:30; }
function invalidBooking(): BadRequestException { return new BadRequestException({ code: 'INVALID_SANDBOX_BOOKING', message: 'Sandbox booking input is invalid' }); }
