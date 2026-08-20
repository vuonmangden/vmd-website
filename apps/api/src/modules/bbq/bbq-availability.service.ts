import { BadRequestException, Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

export interface BbqAvailabilityQuery {
  date: string;
  startTime: string;
  endTime: string;
  guests: number;
  areaId?: string;
}

interface SlotWindow {
  areaId: string | null;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  dateFrom: Date | null;
  dateTo: Date | null;
}

@Injectable()
export class BbqAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds areas/tables that fit the party for a requested date+time window.
   * Excludes tables under an ACTIVE resource hold overlapping that window —
   * BBQ-004 will create those holds (resourceType 'BBQ_TABLE') the same way
   * BKG-003 does for rooms, so this becomes more accurate automatically once
   * that ships. The definitive no-double-booking guarantee still belongs to
   * BBQ-004's reservation write path, not this read-only search.
   */
  async search(input: BbqAvailabilityQuery) {
    const queryDate = parseDate(input.date);
    assertTimeRange(input.startTime, input.endTime);
    if (!Number.isInteger(input.guests) || input.guests < 1) throw invalidQuery();

    const dayOfWeek = queryDate.getUTCDay();
    const slots = await this.prisma.bbqServiceSlot.findMany({
      where: { status: 'ACTIVE' },
      select: { areaId: true, startTime: true, endTime: true, daysOfWeek: true, dateFrom: true, dateTo: true },
    });

    const applicableAreaIds = new Set<string | null>();
    for (const slot of slots) {
      if (!coversRequest(slot, queryDate, dayOfWeek, input.startTime, input.endTime)) continue;
      applicableAreaIds.add(slot.areaId);
    }
    if (applicableAreaIds.size === 0) {
      throw new BadRequestException({
        code: 'BBQ_TIME_OUTSIDE_SERVICE_HOURS',
        message: 'Requested time is outside BBQ service hours',
      });
    }
    const appliesToAllAreas = applicableAreaIds.has(null);

    const start = toTimestamp(input.date, input.startTime);
    const end = toTimestamp(input.date, input.endTime);
    const heldTableIds = await this.heldTableIds(start, end);

    const tableFilter = {
      status: 'ACTIVE',
      deletedAt: null,
      maxCapacity: { gte: input.guests },
      ...(heldTableIds.size > 0 ? { id: { notIn: [...heldTableIds] } } : {}),
    } as const;

    const areas = await this.prisma.bbqArea.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        ...(input.areaId ? { id: input.areaId } : {}),
        tables: { some: tableFilter },
      },
      select: {
        id: true,
        code: true,
        name: true,
        tables: {
          where: tableFilter,
          select: { id: true, code: true, name: true, maxCapacity: true },
          orderBy: { code: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const availableAreas = areas.filter((area) => appliesToAllAreas || applicableAreaIds.has(area.id));

    return {
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      guests: input.guests,
      areas: availableAreas.map((area) => ({
        id: area.id,
        code: area.code,
        name: area.name,
        availableTables: area.tables,
      })),
    };
  }

  private async heldTableIds(start: Date, end: Date): Promise<Set<string>> {
    const holds = await this.prisma.resourceHold.findMany({
      where: { resourceType: 'BBQ_TABLE', status: 'ACTIVE', startAt: { lt: end }, endAt: { gt: start } },
      select: { resourceId: true },
    });
    return new Set(holds.map((hold) => hold.resourceId));
  }
}

function coversRequest(
  slot: SlotWindow,
  queryDate: Date,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
): boolean {
  if (slot.daysOfWeek.length > 0 && !slot.daysOfWeek.includes(dayOfWeek)) return false;
  if (slot.dateFrom && queryDate < slot.dateFrom) return false;
  if (slot.dateTo && queryDate > slot.dateTo) return false;
  return slot.startTime <= startTime && slot.endTime >= endTime;
}

function parseDate(value: string): Date {
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime())) throw invalidQuery();
  return result;
}

/**
 * BBQ times are wall-clock Asia/Ho_Chi_Minh, written as the literal UTC label —
 * the same simplification bookings already use for check-in dates. Consistent
 * everywhere this project stores or compares a time, so overlap checks stay
 * correct even though the instant is not truly UTC.
 */
function toTimestamp(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000Z`);
}

function assertTimeRange(start: string, end: string): void {
  if (start >= end) throw invalidQuery();
}

function invalidQuery(): BadRequestException {
  return new BadRequestException({ code: 'INVALID_BBQ_AVAILABILITY_QUERY', message: 'Availability query is invalid' });
}
