import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateRoomRateRuleDto } from './dto/create-room-rate-rule.dto';
import type { UpdateRoomRateRuleDto } from './dto/update-room-rate-rule.dto';

const CATALOG_SETTING_KEY = 'room.catalog.production';

@Injectable()
export class RoomRateRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomRateRuleDto, actorId: string, correlationId: string) {
    const start = dateOnly(dto.dateFrom);
    const end = dateOnly(dto.dateTo);
    if (end <= start) throw invalidRule();
    if (dto.maxNights !== undefined && dto.maxNights < (dto.minNights ?? 1)) throw invalidRule();
    return this.prisma.$transaction(async (tx) => {
      const roomType = await tx.roomType.findFirst({ where: { id: dto.roomTypeId, deletedAt: null } });
      if (!roomType) throw new NotFoundException({ code: 'ROOM_TYPE_NOT_FOUND', message: 'Room type not found' });
      const created = await tx.roomRateRule.create({ data: {
        roomTypeId: dto.roomTypeId, name: dto.name.trim(), dateFrom: start, dateTo: end,
        daysOfWeek: [...new Set(dto.daysOfWeek ?? [])].sort(), nightlyPrice: BigInt(dto.nightlyPrice),
        extraAdultPrice: BigInt(dto.extraAdultPrice ?? '0'), extraChildPrice: BigInt(dto.extraChildPrice ?? '0'),
        minNights: dto.minNights ?? 1, maxNights: dto.maxNights, priority: dto.priority ?? 0,
        rateType: dto.rateType ?? 'STANDARD', status: dto.status ?? 'DRAFT',
      } });
      await tx.auditLog.create({ data: auditData(actorId, correlationId, 'room_rate_rule.created', created.id, null, created, 'Room rate rule created') });
      return created;
    });
  }

  async update(id: string, dto: UpdateRoomRateRuleDto, actorId: string, correlationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.roomRateRule.findUnique({ where: { id } });
      if (!current) throw new NotFoundException({ code: 'ROOM_RATE_RULE_NOT_FOUND', message: 'Room rate rule not found' });
      const start = dto.dateFrom === undefined ? current.dateFrom : dateOnly(dto.dateFrom);
      const end = dto.dateTo === undefined ? current.dateTo : dateOnly(dto.dateTo);
      const minNights = dto.minNights ?? current.minNights;
      const maxNights = dto.maxNights === undefined ? current.maxNights : dto.maxNights;
      if (end <= start || (maxNights !== null && maxNights < minNights)) throw invalidRule();
      const updated = await tx.roomRateRule.update({ where: { id }, data: updateData(dto, start, end) });
      await tx.auditLog.create({ data: auditData(actorId, correlationId, 'room_rate_rule.updated', id, current, updated, dto.reason) });
      return updated;
    });
  }

  async catalogPolicy() {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: CATALOG_SETTING_KEY }, select: { value: true, updatedAt: true } });
    if (!setting) throw new NotFoundException({ code: 'ROOM_CATALOG_NOT_FOUND', message: 'Production room catalog is not configured' });
    return setting;
  }

  list(roomTypeId?: string) {
    return this.prisma.roomRateRule.findMany({ where: { ...(roomTypeId ? { roomTypeId } : {}) }, orderBy: [{ priority: 'desc' }, { dateFrom: 'asc' }] });
  }
}

function updateData(dto: UpdateRoomRateRuleDto, start: Date, end: Date) {
  return {
    ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
    ...(dto.dateFrom === undefined ? {} : { dateFrom: start }),
    ...(dto.dateTo === undefined ? {} : { dateTo: end }),
    ...(dto.daysOfWeek === undefined ? {} : { daysOfWeek: [...new Set(dto.daysOfWeek)].sort() }),
    ...(dto.nightlyPrice === undefined ? {} : { nightlyPrice: BigInt(dto.nightlyPrice) }),
    ...(dto.extraAdultPrice === undefined ? {} : { extraAdultPrice: BigInt(dto.extraAdultPrice) }),
    ...(dto.extraChildPrice === undefined ? {} : { extraChildPrice: BigInt(dto.extraChildPrice) }),
    ...(dto.minNights === undefined ? {} : { minNights: dto.minNights }),
    ...(dto.maxNights === undefined ? {} : { maxNights: dto.maxNights }),
    ...(dto.priority === undefined ? {} : { priority: dto.priority }),
    ...(dto.rateType === undefined ? {} : { rateType: dto.rateType }),
    ...(dto.status === undefined ? {} : { status: dto.status }),
  };
}

function auditData(actorId: string, correlationId: string, action: string, resourceId: string, before: unknown, after: unknown, reason: string) {
  return {
    actorType: 'STAFF', actorId, action, resourceType: 'room_rate_rules', resourceId,
    beforeData: before === null ? undefined : auditSnapshot(before), afterData: auditSnapshot(after),
    reason: reason.trim(), correlationId: correlationId || null,
  };
}

function auditSnapshot(value: unknown): object {
  return JSON.parse(JSON.stringify(value, (_key, entry) => typeof entry === 'bigint' ? entry.toString() : entry)) as object;
}

function dateOnly(value: string): Date { return new Date(`${value}T00:00:00.000Z`); }
function invalidRule(): BadRequestException { return new BadRequestException({ code: 'INVALID_RATE_RULE', message: 'Invalid rate rule' }); }
