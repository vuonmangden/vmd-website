import { BadRequestException } from '@nestjs/common';
import { BbqAvailabilityService } from './bbq-availability.service';

const AREA_ID = '00000000-0000-4000-8000-000000000020';
const TABLE_ID = '00000000-0000-4000-8000-000000000030';

const LUNCH_SLOT_ALL_AREAS = {
  areaId: null,
  startTime: '11:00',
  endTime: '14:00',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  dateFrom: null,
  dateTo: null,
};

function fakeArea(overrides?: Record<string, unknown>) {
  return {
    id: AREA_ID,
    code: 'VUON_THONG',
    name: 'Khu vườn thông trước',
    tables: [{ id: TABLE_ID, code: 'VUON_THONG-01', name: 'Bàn 1', maxCapacity: 6 }],
    ...overrides,
  };
}

function prismaMock() {
  return {
    bbqServiceSlot: {
      findMany: jest.fn().mockResolvedValue([LUNCH_SLOT_ALL_AREAS]),
    },
    resourceHold: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    bbqArea: {
      findMany: jest.fn().mockResolvedValue([fakeArea()]),
    },
  };
}

// A Saturday, matching the seed slots' every-day-of-week coverage.
const VALID_QUERY = { date: '2026-08-22', startTime: '12:00', endTime: '13:00', guests: 4 };

describe('BbqAvailabilityService.search', () => {
  it('returns areas with tables that fit the party size', async () => {
    const prisma = prismaMock();
    const service = new BbqAvailabilityService(prisma as never);

    const result = await service.search(VALID_QUERY);

    expect(result.areas).toHaveLength(1);
    expect(result.areas[0]?.availableTables).toEqual([
      { id: TABLE_ID, code: 'VUON_THONG-01', name: 'Bàn 1', maxCapacity: 6 },
    ]);
  });

  it('rejects a time window outside all service slots', async () => {
    const prisma = prismaMock();
    const service = new BbqAvailabilityService(prisma as never);

    await expect(
      service.search({ ...VALID_QUERY, startTime: '15:00', endTime: '16:00' }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.bbqArea.findMany).not.toHaveBeenCalled();
  });

  it('rejects a request straddling two slots (partially outside operating hours)', async () => {
    const prisma = prismaMock();
    const service = new BbqAvailabilityService(prisma as never);

    await expect(
      service.search({ ...VALID_QUERY, startTime: '13:30', endTime: '15:00' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects startTime >= endTime', async () => {
    const prisma = prismaMock();
    const service = new BbqAvailabilityService(prisma as never);

    await expect(
      service.search({ ...VALID_QUERY, startTime: '13:00', endTime: '12:00' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a day outside the slot daysOfWeek', async () => {
    const prisma = prismaMock();
    prisma.bbqServiceSlot.findMany.mockResolvedValue([{ ...LUNCH_SLOT_ALL_AREAS, daysOfWeek: [1, 2, 3, 4, 5] }]); // weekdays only
    const service = new BbqAvailabilityService(prisma as never);

    // 2026-08-22 is a Saturday (day 6) per VALID_QUERY.
    await expect(service.search(VALID_QUERY)).rejects.toThrow(BadRequestException);
  });

  it('builds the area/table query to exclude held tables', async () => {
    const prisma = prismaMock();
    prisma.resourceHold.findMany.mockResolvedValue([{ resourceId: TABLE_ID }]);
    const service = new BbqAvailabilityService(prisma as never);

    await service.search(VALID_QUERY);

    const tableFilterArg = prisma.bbqArea.findMany.mock.calls[0][0].where.tables.some;
    expect(tableFilterArg.id).toEqual({ notIn: [TABLE_ID] });
    const selectFilterArg = prisma.bbqArea.findMany.mock.calls[0][0].select.tables.where;
    expect(selectFilterArg.id).toEqual({ notIn: [TABLE_ID] });
  });

  it('does not add an id exclusion when nothing is held', async () => {
    const prisma = prismaMock();
    const service = new BbqAvailabilityService(prisma as never);

    await service.search(VALID_QUERY);

    const tableFilterArg = prisma.bbqArea.findMany.mock.calls[0][0].where.tables.some;
    expect(tableFilterArg.id).toBeUndefined();
  });

  it('queries resource holds for the requested window as BBQ_TABLE resources', async () => {
    const prisma = prismaMock();
    const service = new BbqAvailabilityService(prisma as never);

    await service.search(VALID_QUERY);

    expect(prisma.resourceHold.findMany).toHaveBeenCalledWith({
      where: {
        resourceType: 'BBQ_TABLE',
        status: 'ACTIVE',
        startAt: { lt: new Date('2026-08-22T13:00:00.000Z') },
        endAt: { gt: new Date('2026-08-22T12:00:00.000Z') },
      },
      select: { resourceId: true },
    });
  });

  it('filters to a single area when areaId is given', async () => {
    const prisma = prismaMock();
    const service = new BbqAvailabilityService(prisma as never);

    await service.search({ ...VALID_QUERY, areaId: AREA_ID });

    expect(prisma.bbqArea.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: AREA_ID }) }),
    );
  });

  it('returns no areas when the only matching slot belongs to a different area', async () => {
    const prisma = prismaMock();
    prisma.bbqServiceSlot.findMany.mockResolvedValue([
      { ...LUNCH_SLOT_ALL_AREAS, areaId: '00000000-0000-4000-8000-000000000099' },
    ]);
    const service = new BbqAvailabilityService(prisma as never);

    const result = await service.search({ ...VALID_QUERY, areaId: AREA_ID });

    expect(result.areas).toEqual([]);
  });

  it('rejects zero or negative guests', async () => {
    const prisma = prismaMock();
    const service = new BbqAvailabilityService(prisma as never);

    await expect(service.search({ ...VALID_QUERY, guests: 0 })).rejects.toThrow(BadRequestException);
  });
});
