import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BbqAreaService } from './bbq-area.service';

const AREA_ID = '00000000-0000-4000-8000-000000000020';
const TABLE_ID = '00000000-0000-4000-8000-000000000030';
const SLOT_ID = '00000000-0000-4000-8000-000000000040';

function fakeArea(overrides?: Record<string, unknown>) {
  return {
    id: AREA_ID,
    code: 'VUON_THONG',
    name: 'Khu vườn thông trước',
    minCapacity: 1,
    maxCapacity: 36,
    status: 'ACTIVE',
    sortOrder: 1,
    deletedAt: null,
    tables: [],
    ...overrides,
  };
}

function fakeTable(overrides?: Record<string, unknown>) {
  return {
    id: TABLE_ID,
    areaId: AREA_ID,
    code: 'VUON_THONG-01',
    name: 'Bàn 1',
    minCapacity: 1,
    maxCapacity: 6,
    status: 'ACTIVE',
    turnaroundMinutes: 30,
    deletedAt: null,
    area: { code: 'VUON_THONG', name: 'Khu vườn thông trước' },
    ...overrides,
  };
}

function fakeSlot(overrides?: Record<string, unknown>) {
  return {
    id: SLOT_ID,
    areaId: null,
    name: 'Buổi trưa (11h-14h)',
    startTime: '11:00',
    endTime: '14:00',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    status: 'ACTIVE',
    area: null,
    ...overrides,
  };
}

function prismaMock() {
  return {
    bbqArea: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(fakeArea()),
      update: jest.fn().mockResolvedValue(fakeArea()),
      upsert: jest.fn().mockResolvedValue(fakeArea()),
    },
    bbqTable: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(fakeTable()),
      update: jest.fn().mockResolvedValue(fakeTable()),
    },
    bbqServiceSlot: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(fakeSlot()),
      update: jest.fn().mockResolvedValue(fakeSlot()),
    },
  };
}

// ── Areas ────────────────────────────────────────────────────

describe('BbqAreaService.listAreas', () => {
  it('queries only non-archived areas', async () => {
    const prisma = prismaMock();
    const service = new BbqAreaService(prisma as never);
    await service.listAreas();
    expect(prisma.bbqArea.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } }),
    );
  });
});

describe('BbqAreaService.findAreaById', () => {
  it('returns the area when found', async () => {
    const prisma = prismaMock();
    prisma.bbqArea.findFirst.mockResolvedValue(fakeArea());
    const service = new BbqAreaService(prisma as never);
    const result = await service.findAreaById(AREA_ID);
    expect(result.code).toBe('VUON_THONG');
  });

  it('throws NotFoundException when area is missing', async () => {
    const prisma = prismaMock();
    const service = new BbqAreaService(prisma as never);
    await expect(service.findAreaById(AREA_ID)).rejects.toThrow(NotFoundException);
  });
});

describe('BbqAreaService.createArea', () => {
  it('creates area with trimmed code and name', async () => {
    const prisma = prismaMock();
    const service = new BbqAreaService(prisma as never);
    await service.createArea({
      code: ' VUON_THONG ',
      name: ' Khu vườn thông trước ',
      minCapacity: 1,
      maxCapacity: 36,
    });
    expect(prisma.bbqArea.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: 'VUON_THONG', name: 'Khu vườn thông trước' }),
      }),
    );
  });

  it('rejects maxCapacity < minCapacity', async () => {
    const prisma = prismaMock();
    const service = new BbqAreaService(prisma as never);
    await expect(
      service.createArea({ code: 'X', name: 'X', minCapacity: 10, maxCapacity: 5 }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.bbqArea.create).not.toHaveBeenCalled();
  });
});

describe('BbqAreaService.archiveArea', () => {
  it('sets deletedAt and INACTIVE status', async () => {
    const prisma = prismaMock();
    prisma.bbqArea.findFirst.mockResolvedValue(fakeArea());
    const service = new BbqAreaService(prisma as never);
    await service.archiveArea(AREA_ID);
    expect(prisma.bbqArea.update).toHaveBeenCalledWith({
      where: { id: AREA_ID },
      data: { deletedAt: expect.any(Date), status: 'INACTIVE' },
    });
  });

  it('throws NotFoundException for missing area', async () => {
    const prisma = prismaMock();
    const service = new BbqAreaService(prisma as never);
    await expect(service.archiveArea(AREA_ID)).rejects.toThrow(NotFoundException);
  });
});

// ── Tables ───────────────────────────────────────────────────

describe('BbqAreaService.createTable', () => {
  it('verifies the area exists before creating', async () => {
    const prisma = prismaMock();
    prisma.bbqArea.findFirst.mockResolvedValue(fakeArea());
    const service = new BbqAreaService(prisma as never);
    await service.createTable({
      areaId: AREA_ID,
      code: 'VUON_THONG-01',
      name: 'Bàn 1',
      minCapacity: 1,
      maxCapacity: 6,
    });
    expect(prisma.bbqArea.findFirst).toHaveBeenCalled();
    expect(prisma.bbqTable.create).toHaveBeenCalled();
  });

  it('throws NotFoundException when area does not exist', async () => {
    const prisma = prismaMock();
    const service = new BbqAreaService(prisma as never);
    await expect(
      service.createTable({
        areaId: AREA_ID,
        code: 'X-01',
        name: 'X',
        minCapacity: 1,
        maxCapacity: 4,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects table with maxCapacity < minCapacity', async () => {
    const prisma = prismaMock();
    prisma.bbqArea.findFirst.mockResolvedValue(fakeArea());
    const service = new BbqAreaService(prisma as never);
    await expect(
      service.createTable({
        areaId: AREA_ID,
        code: 'X-01',
        name: 'X',
        minCapacity: 8,
        maxCapacity: 4,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('BbqAreaService.archiveTable', () => {
  it('archives without hard deletion', async () => {
    const prisma = prismaMock();
    prisma.bbqTable.findFirst.mockResolvedValue(fakeTable());
    const service = new BbqAreaService(prisma as never);
    await service.archiveTable(TABLE_ID);
    expect(prisma.bbqTable.update).toHaveBeenCalledWith({
      where: { id: TABLE_ID },
      data: { deletedAt: expect.any(Date), status: 'INACTIVE' },
    });
  });
});

// ── Service Slots ────────────────────────────────────────────

describe('BbqAreaService.createSlot', () => {
  it('creates a slot with null areaId for all areas', async () => {
    const prisma = prismaMock();
    const service = new BbqAreaService(prisma as never);
    await service.createSlot({
      name: 'Buổi trưa',
      startTime: '11:00',
      endTime: '14:00',
    });
    expect(prisma.bbqServiceSlot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ areaId: null }),
      }),
    );
  });

  it('rejects startTime >= endTime', async () => {
    const prisma = prismaMock();
    const service = new BbqAreaService(prisma as never);
    await expect(
      service.createSlot({ name: 'Bad', startTime: '18:00', endTime: '14:00' }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.bbqServiceSlot.create).not.toHaveBeenCalled();
  });

  it('rejects dateFrom after dateTo', async () => {
    const prisma = prismaMock();
    const service = new BbqAreaService(prisma as never);
    await expect(
      service.createSlot({
        name: 'Bad',
        startTime: '11:00',
        endTime: '14:00',
        dateFrom: '2026-12-31',
        dateTo: '2026-01-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

// ── Public ───────────────────────────────────────────────────

describe('BbqAreaService.publicListAreas', () => {
  it('returns only ACTIVE areas', async () => {
    const prisma = prismaMock();
    const service = new BbqAreaService(prisma as never);
    await service.publicListAreas();
    expect(prisma.bbqArea.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE', deletedAt: null },
      }),
    );
  });

  it('excludes internal fields from the select', async () => {
    const prisma = prismaMock();
    const service = new BbqAreaService(prisma as never);
    await service.publicListAreas();
    const selectArg = prisma.bbqArea.findMany.mock.calls[0][0].select;
    expect(selectArg).not.toHaveProperty('deletedAt');
    expect(selectArg).not.toHaveProperty('createdAt');
    expect(selectArg).not.toHaveProperty('updatedAt');
  });
});
