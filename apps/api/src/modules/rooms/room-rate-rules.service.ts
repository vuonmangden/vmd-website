import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateRoomRateRuleDto } from './dto/create-room-rate-rule.dto';

@Injectable()
export class RoomRateRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomRateRuleDto) {
    const start = dateOnly(dto.dateFrom);
    const end = dateOnly(dto.dateTo);
    if (end <= start) throw invalidRule();
    if (dto.maxNights !== undefined && dto.maxNights < (dto.minNights ?? 1)) throw invalidRule();
    const roomType = await this.prisma.roomType.findFirst({ where: { id: dto.roomTypeId, deletedAt: null } });
    if (!roomType) throw new NotFoundException({ code: 'ROOM_TYPE_NOT_FOUND', message: 'Room type not found' });
    return this.prisma.roomRateRule.create({ data: {
      roomTypeId: dto.roomTypeId, name: dto.name.trim(), dateFrom: start, dateTo: end,
      daysOfWeek: [...new Set(dto.daysOfWeek ?? [])].sort(), nightlyPrice: BigInt(dto.nightlyPrice),
      extraAdultPrice: BigInt(dto.extraAdultPrice ?? '0'), extraChildPrice: BigInt(dto.extraChildPrice ?? '0'),
      minNights: dto.minNights ?? 1, maxNights: dto.maxNights, priority: dto.priority ?? 0, status: dto.status ?? 'DRAFT',
    } });
  }

  list(roomTypeId?: string) {
    return this.prisma.roomRateRule.findMany({ where: { ...(roomTypeId ? { roomTypeId } : {}) }, orderBy: [{ priority: 'desc' }, { dateFrom: 'asc' }] });
  }
}

function dateOnly(value: string): Date { return new Date(`${value}T00:00:00.000Z`); }
function invalidRule(): BadRequestException { return new BadRequestException({ code: 'INVALID_RATE_RULE', message: 'Invalid rate rule' }); }
