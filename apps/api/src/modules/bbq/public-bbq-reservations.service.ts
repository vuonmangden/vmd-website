import { BadRequestException, ConflictException, Inject, Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BbqMenuService } from './bbq-menu.service';
import type { CreatePublicBbqReservationDto } from './dto/create-public-bbq-reservation.dto';

const IDEMPOTENCY_SCOPE = 'public.bbq.checkout';
const DAILY_QUOTA = 120;
const TERMINAL_STATUSES = ['CANCELLED', 'EXPIRED'] as const;
const PUBLIC_BBQ_RESERVATIONS_CLOCK = 'PUBLIC_BBQ_RESERVATIONS_CLOCK';
export interface PublicCheckoutActor { correlationId?: string; ipAddress?: string; userAgent?: string; }

/** Public requests consume daily quota, never a physical table or a deposit. */
@Injectable()
export class PublicBbqReservationsService {
  constructor(private readonly prisma: PrismaService, private readonly bbqMenu: BbqMenuService, @Optional() @Inject(PUBLIC_BBQ_RESERVATIONS_CLOCK) private readonly now: () => Date = () => new Date()) {}

  async create(dto: CreatePublicBbqReservationDto, idempotencyKey: string, actor: PublicCheckoutActor) {
    const key = idempotencyKey.trim();
    if (!key || key.length > 120) throw invalid();
    const requestHash = createHash('sha256').update(JSON.stringify(dto)).digest('hex');
    const phone = normalizeVietnamesePhone(dto.phone);
    const email = dto.email?.trim().toLowerCase() || null;
    const children = dto.children ?? 0;
    const totalGuests = dto.adults + children;
    const items = dto.items ?? [];
    if (!phone || totalGuests < 2 || totalGuests > 20 || items.length > 50) throw invalid();
    if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999)) throw invalid();

    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.idempotencyKey.findUnique({ where: { key } });
      if (previous?.responseBody) {
        if (previous.requestHash !== requestHash) throw idempotencyConflict();
        return previous.responseBody;
      }
      await assertWithinServiceHours(tx, dto.date, dto.startTime);
      // Serializes check+create even if no previous row exists for this date.
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`bbq-daily-quota:${dto.date}`}))`);
      const usage = await tx.bbqReservation.aggregate({
        where: { reservationDate: operationalDate(dto.date), status: { notIn: [...TERMINAL_STATUSES] } },
        _sum: { adults: true, children: true },
      });
      const usedGuests = (usage._sum.adults ?? 0) + (usage._sum.children ?? 0);
      if (usedGuests + totalGuests > DAILY_QUOTA) throw quotaExceeded();

      const itemCodes = items.filter((item) => item.type === 'MENU_ITEM').map((item) => item.code);
      const comboCodes = items.filter((item) => item.type === 'COMBO').map((item) => item.code);
      const snapshot = await this.bbqMenu.snapshotPrices({ itemCodes, comboCodes }, tx);
      const lineRows = buildLineRows(items, snapshot);
      const itemsAmount = lineRows.reduce((sum, row) => sum + row.lineTotal, 0n);
      const now = this.now();
      const customer = await tx.customer.findFirst({ where: { deletedAt: null, OR: [{ phoneNormalized: phone }, ...(email ? [{ emailNormalized: email }] : [])] }, orderBy: { createdAt: 'asc' } })
        ?? await tx.customer.create({ data: { customerCode: CustomersService.generateCode(), fullName: dto.fullName.trim(), phoneNormalized: phone, emailNormalized: email, source: 'DIRECT' } });
      const reservation = await tx.bbqReservation.create({ data: {
        reservationCode: `BBQ-${randomUUID().slice(0, 8).toUpperCase()}`,
        customerId: customer.id,
        reservationDate: operationalDate(dto.date),
        startTime: dto.startTime,
        // Existing column is non-null. This is the service boundary, not a promised duration.
        endTime: '21:30',
        adults: dto.adults,
        children,
        status: 'PENDING_CONFIRMATION',
        source: 'PUBLIC',
        itemsAmount,
        depositAmount: 0n,
        specialRequest: dto.specialRequest?.trim() || null,
      } });
      await tx.customer.update({ where: { id: customer.id }, data: { lastBookingAt: now, firstBookingAt: customer.createdAt } });
      if (lineRows.length) await tx.bbqReservationItem.createMany({ data: lineRows.map((row) => ({ ...row, reservationId: reservation.id })) });
      await tx.bbqReservationStatusHistory.create({ data: { reservationId: reservation.id, toStatus: 'PENDING_CONFIRMATION', reason: 'public booking awaiting front-desk confirmation' } });
      const response = { reservationCode: reservation.reservationCode, status: 'PENDING_CONFIRMATION', confirmationRequired: true };
      await tx.idempotencyKey.create({ data: { key, scope: IDEMPOTENCY_SCOPE, requestHash, responseStatus: 201, responseBody: response, expiresAt: new Date(now.getTime() + 30 * 60_000) } });
      await tx.outboxEvent.create({ data: { aggregateType: 'BBQ_RESERVATION', aggregateId: reservation.id, eventType: 'bbq_reservation.requested.public', payload: { reservationId: reservation.id, reservationCode: reservation.reservationCode, guestCount: totalGuests, correlationId: actor.correlationId ?? null } } });
      return response;
    });
  }
}

interface MenuSnapshot { items: { code: string; name: string; unit: string; price: string }[]; combos: { code: string; name: string; price: string }[]; }
function buildLineRows(items: NonNullable<CreatePublicBbqReservationDto['items']>, snapshot: MenuSnapshot) {
  return items.map((item) => {
    const source = item.type === 'MENU_ITEM' ? snapshot.items.find((entry) => entry.code === item.code) : snapshot.combos.find((entry) => entry.code === item.code);
    if (!source) throw new BadRequestException({ code: 'BBQ_MENU_ENTRY_UNAVAILABLE', message: 'Menu entry not found' });
    const unitPrice = BigInt(source.price);
    return { itemType: item.type, code: item.code, nameSnapshot: source.name, unitSnapshot: item.type === 'MENU_ITEM' ? (source as MenuSnapshot['items'][number]).unit : null, unitPrice, quantity: item.quantity, lineTotal: unitPrice * BigInt(item.quantity) };
  });
}
async function assertWithinServiceHours(tx: Prisma.TransactionClient, date: string, startTime: string): Promise<void> {
  const queryDate = operationalDate(date);
  const dayOfWeek = queryDate.getUTCDay();
  const slots = await tx.bbqServiceSlot.findMany({ where: { status: 'ACTIVE' }, select: { startTime: true, endTime: true, daysOfWeek: true, dateFrom: true, dateTo: true } });
  const covered = slots.some((slot) => (!slot.daysOfWeek.length || slot.daysOfWeek.includes(dayOfWeek)) && (!slot.dateFrom || queryDate >= slot.dateFrom) && (!slot.dateTo || queryDate <= slot.dateTo) && slot.startTime <= startTime && slot.endTime >= startTime);
  if (!covered) throw new BadRequestException({ code: 'BBQ_TIME_OUTSIDE_SERVICE_HOURS', message: 'Requested arrival time is outside BBQ service hours' });
}
function operationalDate(value: string): Date { const result = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(result.getTime())) throw invalid(); return result; }
function normalizeVietnamesePhone(value: string): string | null { const compact = value.replace(/[\s.-]/g, ''); const match = compact.match(/^(?:\+84|84|0)([35789]\d{8})$/); return match ? `+84${match[1]}` : null; }
function invalid(): BadRequestException { return new BadRequestException({ code: 'INVALID_PUBLIC_BBQ_RESERVATION', message: 'BBQ reservation details are invalid' }); }
function quotaExceeded(): ConflictException { return new ConflictException({ code: 'BBQ_DAILY_QUOTA_EXCEEDED', message: 'BBQ daily guest quota has been reached' }); }
function idempotencyConflict(): ConflictException { return new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency key was already used with a different request' }); }
