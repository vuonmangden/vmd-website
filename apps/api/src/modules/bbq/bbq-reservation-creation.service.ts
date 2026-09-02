import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BbqMenuService } from './bbq-menu.service';

const IDEMPOTENCY_KEY_PREFIX = 'bbq-reservation:';
const IDEMPOTENCY_SCOPE = 'bbq.reservation.create';

export interface CreateBbqReservationItemInput {
  type: 'MENU_ITEM' | 'COMBO';
  code: string;
  quantity: number;
}

export interface CreateBbqReservationInput {
  customerId: string;
  tableId: string;
  date: string;
  startTime: string;
  endTime: string;
  adults: number;
  children: number;
  items: CreateBbqReservationItemInput[];
  specialRequest?: string;
  idempotencyKey: string;
}

@Injectable()
export class BbqReservationCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bbqMenu: BbqMenuService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(input: CreateBbqReservationInput) {
    assertValidInput(input);
    const normalizedKey = input.idempotencyKey.trim();
    const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const previous = await tx.idempotencyKey.findUnique({ where: { key: normalizedKey } });
        if (previous?.responseBody) return previous.responseBody;

        const table = await tx.bbqTable.findFirst({
          where: { id: input.tableId, status: 'ACTIVE', deletedAt: null },
        });
        if (!table) throw new NotFoundException({ code: 'BBQ_TABLE_NOT_FOUND', message: 'BBQ table not found' });

        const totalGuests = input.adults + input.children;
        if (totalGuests < table.minCapacity || totalGuests > table.maxCapacity) {
          throw new BadRequestException({
            code: 'BBQ_TABLE_CAPACITY_MISMATCH',
            message: 'Guest count does not fit this table',
          });
        }

        await this.assertWithinServiceHours(tx, table.areaId, input.date, input.startTime, input.endTime);

        const startAt = toTimestamp(input.date, input.startTime);
        const endAt = toTimestamp(input.date, input.endTime);

        const itemCodes = input.items.filter((i) => i.type === 'MENU_ITEM').map((i) => i.code);
        const comboCodes = input.items.filter((i) => i.type === 'COMBO').map((i) => i.code);
        const snapshot = await this.bbqMenu.snapshotPrices({ itemCodes, comboCodes }, tx);

        const lineRows = buildLineRows(input.items, snapshot);
        const itemsAmount = lineRows.reduce((sum, row) => sum + row.lineTotal, 0n);
        const depositAmount = 0n;

        const now = this.now();
        const reservation = await tx.bbqReservation.create({
          data: {
            reservationCode: `BBQ-${randomUUID().slice(0, 8).toUpperCase()}`,
            customerId: input.customerId,
            reservationDate: new Date(`${input.date}T00:00:00.000Z`),
            startTime: input.startTime,
            endTime: input.endTime,
            adults: input.adults,
            children: input.children,
            status: 'PENDING_CONFIRMATION',
            source: 'ADMIN',
            itemsAmount,
            depositAmount,
            specialRequest: input.specialRequest?.trim() || null,
          },
        });

        await tx.bbqReservationTable.create({
          data: {
            reservationId: reservation.id,
            tableId: table.id,
            areaId: table.areaId,
            startAt,
            endAt,
            status: 'ACTIVE',
          },
        });

        if (lineRows.length > 0) {
          await tx.bbqReservationItem.createMany({
            data: lineRows.map((row) => ({ ...row, reservationId: reservation.id })),
          });
        }

        const expiresAt = new Date(now.getTime() + holdMinutes() * 60_000);
        await tx.resourceHold.create({
          data: {
            resourceType: 'BBQ_TABLE',
            resourceId: table.id,
            referenceType: 'BBQ_RESERVATION',
            referenceId: reservation.id,
            startAt,
            endAt,
            expiresAt,
            status: 'ACTIVE',
            idempotencyKey: `${IDEMPOTENCY_KEY_PREFIX}${normalizedKey}`,
          },
        });

        await tx.bbqReservationStatusHistory.create({
          data: { reservationId: reservation.id, toStatus: 'PENDING_CONFIRMATION', reason: 'reservation created awaiting confirmation' },
        });

        const response = {
          reservationId: reservation.id,
          reservationCode: reservation.reservationCode,
          status: reservation.status,
          tableId: table.id,
          tableCode: table.code,
          areaId: table.areaId,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          adults: input.adults,
          children: input.children,
          itemsAmount: itemsAmount.toString(),
          depositAmount: depositAmount.toString(),
          currency: reservation.currency,
          holdExpiresAt: expiresAt.toISOString(),
          createdAt: now.toISOString(),
        };

        await tx.idempotencyKey.create({
          data: {
            key: normalizedKey,
            scope: IDEMPOTENCY_SCOPE,
            requestHash,
            responseStatus: 201,
            responseBody: response,
            expiresAt,
          },
        });
        await tx.outboxEvent.create({
          data: {
            aggregateType: 'BBQ_RESERVATION',
            aggregateId: reservation.id,
            eventType: 'bbq_reservation.created',
            payload: response,
          },
        });

        return response;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ code: 'BBQ_RESERVATION_CONFLICT', message: 'Reservation could not be created' });
      }
      // Exclusion-constraint violations (SQLSTATE 23P01, the overlapping-table
      // guard) surface as Prisma's generic constraint-failure code — this is
      // the case that means "someone else just took this table/time".
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2004') {
        throw new ConflictException({
          code: 'BBQ_TABLE_CONFLICT',
          message: 'This table is no longer available for the requested time',
        });
      }
      throw error;
    }
  }

  private async assertWithinServiceHours(
    tx: Prisma.TransactionClient,
    areaId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    const queryDate = new Date(`${date}T00:00:00.000Z`);
    const dayOfWeek = queryDate.getUTCDay();
    const slots = await tx.bbqServiceSlot.findMany({
      where: { status: 'ACTIVE' },
      select: { areaId: true, startTime: true, endTime: true, daysOfWeek: true, dateFrom: true, dateTo: true },
    });

    const covered = slots.some((slot) => {
      if (slot.areaId !== null && slot.areaId !== areaId) return false;
      if (slot.daysOfWeek.length > 0 && !slot.daysOfWeek.includes(dayOfWeek)) return false;
      if (slot.dateFrom && queryDate < slot.dateFrom) return false;
      if (slot.dateTo && queryDate > slot.dateTo) return false;
      return slot.startTime <= startTime && slot.endTime >= endTime;
    });

    if (!covered) {
      throw new BadRequestException({
        code: 'BBQ_TIME_OUTSIDE_SERVICE_HOURS',
        message: 'Requested time is outside BBQ service hours',
      });
    }
  }
}

interface MenuSnapshot {
  items: { code: string; name: string; unit: string; price: string }[];
  combos: { code: string; name: string; price: string }[];
}

function buildLineRows(items: CreateBbqReservationItemInput[], snapshot: MenuSnapshot) {
  return items.map((item) => {
    let name: string;
    let price: string;
    let unit: string | null;
    if (item.type === 'MENU_ITEM') {
      const source = snapshot.items.find((entry) => entry.code === item.code);
      // snapshotPrices() already throws if any requested code is missing, so
      // this is unreachable in practice — narrowing for TypeScript only.
      if (!source) throw new NotFoundException({ code: 'BBQ_MENU_ENTRY_UNAVAILABLE', message: 'Menu entry not found' });
      name = source.name;
      price = source.price;
      unit = source.unit;
    } else {
      const source = snapshot.combos.find((entry) => entry.code === item.code);
      if (!source) throw new NotFoundException({ code: 'BBQ_MENU_ENTRY_UNAVAILABLE', message: 'Menu entry not found' });
      name = source.name;
      price = source.price;
      unit = null;
    }
    const unitPrice = BigInt(price);
    const quantity = BigInt(item.quantity);
    return {
      itemType: item.type,
      code: item.code,
      nameSnapshot: name,
      unitSnapshot: unit,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * quantity,
    };
  });
}

function assertValidInput(input: CreateBbqReservationInput): void {
  if (input.adults < 1 || input.children < 0) throw invalidInput();
  if (input.startTime >= input.endTime) throw invalidInput();
  if (!input.idempotencyKey.trim()) throw invalidInput();
  if (input.items.length > 50) throw invalidInput();
  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) throw invalidInput();
  }
}

/**
 * BBQ times are wall-clock Asia/Ho_Chi_Minh, written as the literal UTC
 * label — same convention as BbqAvailabilityService and booking check-in
 * dates elsewhere in this project.
 */
function toTimestamp(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000Z`);
}

function holdMinutes(): number {
  const value = Number.parseInt(process.env['BBQ_HOLD_MINUTES'] ?? '30', 10);
  return Number.isInteger(value) && value > 0 && value <= 360 ? value : 30;
}

function invalidInput(): BadRequestException {
  return new BadRequestException({ code: 'INVALID_BBQ_RESERVATION', message: 'BBQ reservation input is invalid' });
}
