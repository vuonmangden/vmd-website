import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PaymentsService } from '../payments/payments.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BbqMenuService } from './bbq-menu.service';
import type { CreatePublicBbqReservationDto } from './dto/create-public-bbq-reservation.dto';

const DEPOSIT_SETTING_KEY = 'bbq.deposit_amount_per_table';
const IDEMPOTENCY_SCOPE = 'public.bbq.checkout';

export interface PublicCheckoutActor { correlationId?: string; ipAddress?: string; userAgent?: string; }

@Injectable()
export class PublicBbqReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bbqMenu: BbqMenuService,
    private readonly payments: PaymentsService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(dto: CreatePublicBbqReservationDto, idempotencyKey: string, actor: PublicCheckoutActor) {
    const key = idempotencyKey.trim();
    if (!key || key.length > 120) throw invalid();
    const requestHash = createHash('sha256').update(JSON.stringify(dto)).digest('hex');
    if (dto.startTime >= dto.endTime) throw invalid();
    const phone = normalizeVietnamesePhone(dto.phone);
    if (!phone) throw invalid();
    const email = dto.email?.trim().toLowerCase() || null;
    const adults = dto.adults;
    const children = dto.children ?? 0;
    const items = dto.items ?? [];
    if (items.length > 50) throw invalid();
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) throw invalid();
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const previous = await tx.idempotencyKey.findUnique({ where: { key } });
        if (previous?.responseBody) return previous.responseBody;

        const table = await tx.bbqTable.findFirst({ where: { id: dto.tableId, status: 'ACTIVE', deletedAt: null } });
        if (!table) throw notFoundTable();
        const totalGuests = adults + children;
        if (totalGuests < table.minCapacity || totalGuests > table.maxCapacity) throw capacityMismatch();

        await assertWithinServiceHours(tx, table.areaId, dto.date, dto.startTime, dto.endTime);

        const startAt = toTimestamp(dto.date, dto.startTime);
        const endAt = toTimestamp(dto.date, dto.endTime);

        const itemCodes = items.filter((item) => item.type === 'MENU_ITEM').map((item) => item.code);
        const comboCodes = items.filter((item) => item.type === 'COMBO').map((item) => item.code);
        const snapshot = await this.bbqMenu.snapshotPrices({ itemCodes, comboCodes }, tx);
        const lineRows = buildLineRows(items, snapshot);
        const itemsAmount = lineRows.reduce((sum, row) => sum + row.lineTotal, 0n);
        const depositAmount = await readDepositAmount(tx.appSetting);

        const customer = await tx.customer.findFirst({ where: { deletedAt: null, OR: [{ phoneNormalized: phone }, ...(email ? [{ emailNormalized: email }] : [])] }, orderBy: { createdAt: 'asc' } })
          ?? await tx.customer.create({ data: { customerCode: CustomersService.generateCode(), fullName: dto.fullName.trim(), phoneNormalized: phone, emailNormalized: email, source: 'DIRECT' } });

        const now = this.now();
        const reservation = await tx.bbqReservation.create({
          data: {
            reservationCode: `BBQ-${randomUUID().slice(0, 8).toUpperCase()}`,
            customerId: customer.id,
            reservationDate: new Date(`${dto.date}T00:00:00.000Z`),
            startTime: dto.startTime,
            endTime: dto.endTime,
            adults,
            children,
            status: 'PENDING_PAYMENT',
            source: 'PUBLIC',
            itemsAmount,
            depositAmount,
            specialRequest: dto.specialRequest?.trim() || null,
          },
        });
        await tx.customer.update({ where: { id: customer.id }, data: { lastBookingAt: now, firstBookingAt: customer.createdAt } });

        await tx.bbqReservationTable.create({ data: { reservationId: reservation.id, tableId: table.id, areaId: table.areaId, startAt, endAt, status: 'ACTIVE' } });
        if (lineRows.length > 0) {
          await tx.bbqReservationItem.createMany({ data: lineRows.map((row) => ({ ...row, reservationId: reservation.id })) });
        }

        const holdExpiresAt = new Date(now.getTime() + holdMinutes() * 60_000);
        const hold = await tx.resourceHold.create({
          data: {
            resourceType: 'BBQ_TABLE',
            resourceId: table.id,
            referenceType: 'BBQ_RESERVATION',
            referenceId: reservation.id,
            startAt,
            endAt,
            expiresAt: holdExpiresAt,
            status: 'ACTIVE',
            idempotencyKey: `bbq-reservation:${key}`,
          },
        });
        await tx.bbqReservationStatusHistory.create({ data: { reservationId: reservation.id, toStatus: 'PENDING_PAYMENT', reason: 'public sandbox checkout' } });

        const payment = await this.payments.createSandboxIntentForBbqCheckout(
          tx,
          { id: reservation.id, depositAmount, currency: reservation.currency, createdAt: now },
          hold.id,
          { staffProfileId: '', correlationId: actor.correlationId, ipAddress: actor.ipAddress, userAgent: actor.userAgent },
        );

        const response = { reservationCode: reservation.reservationCode, status: 'PENDING_PAYMENT', paymentReference: payment.paymentIntentId };
        await tx.idempotencyKey.create({ data: { key, scope: IDEMPOTENCY_SCOPE, requestHash, responseStatus: 201, responseBody: response, expiresAt: new Date(payment.expiresAt) } });
        await tx.outboxEvent.create({ data: { aggregateType: 'BBQ_RESERVATION', aggregateId: reservation.id, eventType: 'bbq_reservation.created.public', payload: { reservationId: reservation.id, reservationCode: reservation.reservationCode } } });
        return response;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ code: 'BBQ_RESERVATION_CONFLICT', message: 'Reservation could not be created' });
      }
      // Exclusion-constraint violation (SQLSTATE 23P01) — someone else just took this table/time.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2004') throw unavailable();
      throw error;
    }
  }
}

interface MenuSnapshot {
  items: { code: string; name: string; unit: string; price: string }[];
  combos: { code: string; name: string; price: string }[];
}

function buildLineRows(items: { type: 'MENU_ITEM' | 'COMBO'; code: string; quantity: number }[], snapshot: MenuSnapshot) {
  return items.map((item) => {
    let name: string;
    let price: string;
    let unit: string | null;
    if (item.type === 'MENU_ITEM') {
      const source = snapshot.items.find((entry) => entry.code === item.code);
      if (!source) throw menuEntryUnavailable();
      name = source.name;
      price = source.price;
      unit = source.unit;
    } else {
      const source = snapshot.combos.find((entry) => entry.code === item.code);
      if (!source) throw menuEntryUnavailable();
      name = source.name;
      price = source.price;
      unit = null;
    }
    const unitPrice = BigInt(price);
    const quantity = BigInt(item.quantity);
    return { itemType: item.type, code: item.code, nameSnapshot: name, unitSnapshot: unit, unitPrice, quantity: item.quantity, lineTotal: unitPrice * quantity };
  });
}

async function assertWithinServiceHours(tx: Prisma.TransactionClient, areaId: string, date: string, startTime: string, endTime: string): Promise<void> {
  const queryDate = new Date(`${date}T00:00:00.000Z`);
  const dayOfWeek = queryDate.getUTCDay();
  const slots = await tx.bbqServiceSlot.findMany({ where: { status: 'ACTIVE' }, select: { areaId: true, startTime: true, endTime: true, daysOfWeek: true, dateFrom: true, dateTo: true } });
  const covered = slots.some((slot) => {
    if (slot.areaId !== null && slot.areaId !== areaId) return false;
    if (slot.daysOfWeek.length > 0 && !slot.daysOfWeek.includes(dayOfWeek)) return false;
    if (slot.dateFrom && queryDate < slot.dateFrom) return false;
    if (slot.dateTo && queryDate > slot.dateTo) return false;
    return slot.startTime <= startTime && slot.endTime >= endTime;
  });
  if (!covered) throw new BadRequestException({ code: 'BBQ_TIME_OUTSIDE_SERVICE_HOURS', message: 'Requested time is outside BBQ service hours' });
}

/** BBQ times are wall-clock Asia/Ho_Chi_Minh, written as the literal UTC label — same convention as the admin BBQ reservation flow. */
function toTimestamp(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000Z`);
}

function holdMinutes(): number {
  const value = Number.parseInt(process.env['BBQ_HOLD_MINUTES'] ?? '120', 10);
  return Number.isInteger(value) && value > 0 && value <= 360 ? value : 120;
}

async function readDepositAmount(settings: { findUnique(args: unknown): Promise<{ value: unknown } | null> }): Promise<bigint> {
  const setting = await settings.findUnique({ where: { key: DEPOSIT_SETTING_KEY } });
  const value = setting?.value && typeof setting.value === 'object' && typeof (setting.value as { amount?: unknown }).amount === 'number'
    ? (setting.value as { amount: number }).amount
    : NaN;
  if (!Number.isInteger(value) || value <= 0) throw new ServiceUnavailableException({ code: 'BBQ_DEPOSIT_NOT_CONFIGURED', message: 'BBQ deposit amount is not configured' });
  return BigInt(value);
}

function normalizeVietnamesePhone(value: string): string | null {
  const compact = value.replace(/[\s.-]/g, '');
  const match = compact.match(/^(?:\+84|84|0)([35789]\d{8})$/);
  return match ? `+84${match[1]}` : null;
}

function invalid(): BadRequestException { return new BadRequestException({ code: 'INVALID_PUBLIC_BBQ_RESERVATION', message: 'BBQ reservation details are invalid' }); }
function notFoundTable(): BadRequestException { return new BadRequestException({ code: 'BBQ_TABLE_NOT_FOUND', message: 'BBQ table not found' }); }
function capacityMismatch(): BadRequestException { return new BadRequestException({ code: 'BBQ_TABLE_CAPACITY_MISMATCH', message: 'Guest count does not fit this table' }); }
function menuEntryUnavailable(): BadRequestException { return new BadRequestException({ code: 'BBQ_MENU_ENTRY_UNAVAILABLE', message: 'Menu entry not found' }); }
function unavailable(): ConflictException { return new ConflictException({ code: 'BBQ_TABLE_CONFLICT', message: 'This table is no longer available for the requested time' }); }
