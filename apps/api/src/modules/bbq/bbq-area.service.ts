import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateBbqAreaDto,
  CreateBbqServiceSlotDto,
  CreateBbqTableDto,
  UpdateBbqAreaDto,
  UpdateBbqServiceSlotDto,
  UpdateBbqTableDto,
} from './dto/bbq-area.dto';

@Injectable()
export class BbqAreaService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Areas ──────────────────────────────────────────────────

  listAreas() {
    return this.prisma.bbqArea.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { tables: { where: { deletedAt: null } } } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findAreaById(id: string) {
    const area = await this.prisma.bbqArea.findFirst({
      where: { id, deletedAt: null },
      include: { tables: { where: { deletedAt: null }, orderBy: { code: 'asc' } } },
    });
    if (!area) {
      throw new NotFoundException({ code: 'BBQ_AREA_NOT_FOUND', message: 'BBQ area not found' });
    }
    return area;
  }

  async createArea(dto: CreateBbqAreaDto) {
    assertCapacity(dto.minCapacity, dto.maxCapacity);
    return this.prisma.bbqArea.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        minCapacity: dto.minCapacity,
        maxCapacity: dto.maxCapacity,
        status: dto.status ?? 'ACTIVE',
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateArea(id: string, dto: UpdateBbqAreaDto) {
    const current = await this.findAreaById(id);
    assertCapacity(
      dto.minCapacity ?? current.minCapacity,
      dto.maxCapacity ?? current.maxCapacity,
    );
    const data: Prisma.BbqAreaUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.minCapacity !== undefined) data.minCapacity = dto.minCapacity;
    if (dto.maxCapacity !== undefined) data.maxCapacity = dto.maxCapacity;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    return this.prisma.bbqArea.update({ where: { id }, data });
  }

  async archiveArea(id: string) {
    await this.findAreaById(id);
    return this.prisma.bbqArea.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }

  // ── Tables ─────────────────────────────────────────────────

  listTables(areaId?: string) {
    const where: Prisma.BbqTableWhereInput = { deletedAt: null };
    if (areaId) where.areaId = areaId;
    return this.prisma.bbqTable.findMany({
      where,
      include: { area: { select: { code: true, name: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async findTableById(id: string) {
    const table = await this.prisma.bbqTable.findFirst({
      where: { id, deletedAt: null },
      include: { area: { select: { code: true, name: true } } },
    });
    if (!table) {
      throw new NotFoundException({ code: 'BBQ_TABLE_NOT_FOUND', message: 'BBQ table not found' });
    }
    return table;
  }

  async createTable(dto: CreateBbqTableDto) {
    await this.findAreaById(dto.areaId);
    assertCapacity(dto.minCapacity, dto.maxCapacity);
    return this.prisma.bbqTable.create({
      data: {
        areaId: dto.areaId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        minCapacity: dto.minCapacity,
        maxCapacity: dto.maxCapacity,
        status: dto.status ?? 'ACTIVE',
        turnaroundMinutes: dto.turnaroundMinutes ?? 30,
      },
    });
  }

  async updateTable(id: string, dto: UpdateBbqTableDto) {
    const current = await this.findTableById(id);
    assertCapacity(
      dto.minCapacity ?? current.minCapacity,
      dto.maxCapacity ?? current.maxCapacity,
    );
    const data: Prisma.BbqTableUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.minCapacity !== undefined) data.minCapacity = dto.minCapacity;
    if (dto.maxCapacity !== undefined) data.maxCapacity = dto.maxCapacity;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.turnaroundMinutes !== undefined) data.turnaroundMinutes = dto.turnaroundMinutes;
    return this.prisma.bbqTable.update({ where: { id }, data });
  }

  async archiveTable(id: string) {
    await this.findTableById(id);
    return this.prisma.bbqTable.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }

  // ── Service Slots ──────────────────────────────────────────

  listSlots() {
    return this.prisma.bbqServiceSlot.findMany({
      include: { area: { select: { code: true, name: true } } },
      orderBy: [{ startTime: 'asc' }, { name: 'asc' }],
    });
  }

  async findSlotById(id: string) {
    const slot = await this.prisma.bbqServiceSlot.findUnique({
      where: { id },
      include: { area: { select: { code: true, name: true } } },
    });
    if (!slot) {
      throw new NotFoundException({
        code: 'BBQ_SERVICE_SLOT_NOT_FOUND',
        message: 'BBQ service slot not found',
      });
    }
    return slot;
  }

  async createSlot(dto: CreateBbqServiceSlotDto) {
    assertTimeRange(dto.startTime, dto.endTime);
    if (dto.dateFrom && dto.dateTo && dto.dateFrom > dto.dateTo) {
      throw new BadRequestException({
        code: 'INVALID_BBQ_SLOT_DATE_RANGE',
        message: 'dateFrom cannot be after dateTo',
      });
    }
    if (dto.areaId) await this.findAreaById(dto.areaId);
    return this.prisma.bbqServiceSlot.create({
      data: {
        areaId: dto.areaId ?? null,
        name: dto.name.trim(),
        startTime: dto.startTime,
        endTime: dto.endTime,
        bookingIntervalMinutes: dto.bookingIntervalMinutes ?? null,
        maxTotalGuests: dto.maxTotalGuests ?? null,
        daysOfWeek: dto.daysOfWeek ?? [],
        dateFrom: dto.dateFrom ? new Date(dto.dateFrom) : null,
        dateTo: dto.dateTo ? new Date(dto.dateTo) : null,
        status: dto.status ?? 'ACTIVE',
      },
    });
  }

  async updateSlot(id: string, dto: UpdateBbqServiceSlotDto) {
    const current = await this.findSlotById(id);
    const startTime = dto.startTime ?? current.startTime;
    const endTime = dto.endTime ?? current.endTime;
    assertTimeRange(startTime, endTime);

    const data: Prisma.BbqServiceSlotUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.startTime !== undefined) data.startTime = dto.startTime;
    if (dto.endTime !== undefined) data.endTime = dto.endTime;
    if (dto.bookingIntervalMinutes !== undefined)
      data.bookingIntervalMinutes = dto.bookingIntervalMinutes;
    if (dto.maxTotalGuests !== undefined) data.maxTotalGuests = dto.maxTotalGuests;
    if (dto.daysOfWeek !== undefined) data.daysOfWeek = dto.daysOfWeek;
    if (dto.dateFrom !== undefined) data.dateFrom = dto.dateFrom ? new Date(dto.dateFrom) : null;
    if (dto.dateTo !== undefined) data.dateTo = dto.dateTo ? new Date(dto.dateTo) : null;
    if (dto.status !== undefined) data.status = dto.status;
    return this.prisma.bbqServiceSlot.update({ where: { id }, data });
  }

  // ── Public ─────────────────────────────────────────────────

  async publicListAreas() {
    const areas = await this.prisma.bbqArea.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        minCapacity: true,
        maxCapacity: true,
        sortOrder: true,
        tables: {
          where: { status: 'ACTIVE', deletedAt: null },
          select: {
            id: true,
            code: true,
            name: true,
            minCapacity: true,
            maxCapacity: true,
          },
          orderBy: { code: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const slots = await this.prisma.bbqServiceSlot.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        daysOfWeek: true,
        areaId: true,
      },
      orderBy: [{ startTime: 'asc' }],
    });

    return {
      areas: areas.map((area) => ({
        ...area,
        serviceSlots: slots.filter((s) => s.areaId === null || s.areaId === area.id),
      })),
    };
  }
}

function assertCapacity(min: number, max: number): void {
  if (max < min) {
    throw new BadRequestException({
      code: 'INVALID_BBQ_CAPACITY',
      message: 'maxCapacity cannot be less than minCapacity',
    });
  }
}

function assertTimeRange(start: string, end: string): void {
  if (start >= end) {
    throw new BadRequestException({
      code: 'INVALID_BBQ_SLOT_TIME_RANGE',
      message: 'startTime must be before endTime',
    });
  }
}
