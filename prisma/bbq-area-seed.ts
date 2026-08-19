import type { PrismaClient } from '@prisma/client';

interface AreaDef {
  code: string;
  name: string;
  maxCapacity: number;
  sortOrder: number;
  tables: { code: string; name: string; maxCapacity: number }[];
}

const AREAS: AreaDef[] = [
  {
    code: 'VUON_THONG',
    name: 'Khu vườn thông trước',
    maxCapacity: 36,
    sortOrder: 1,
    tables: Array.from({ length: 6 }, (_, i) => ({
      code: `VUON_THONG-${String(i + 1).padStart(2, '0')}`,
      name: `Bàn ${i + 1}`,
      maxCapacity: 6,
    })),
  },
  {
    code: 'SAN_GACH_DO',
    name: 'Khu sân gạch đỏ',
    maxCapacity: 24,
    sortOrder: 2,
    tables: Array.from({ length: 6 }, (_, i) => ({
      code: `SAN_GACH_DO-${String(i + 1).padStart(2, '0')}`,
      name: `Bàn ${i + 1}`,
      maxCapacity: 4,
    })),
  },
  {
    code: 'SAN_TRUOC',
    name: 'Khu sân trước homestay',
    maxCapacity: 40,
    sortOrder: 3,
    tables: Array.from({ length: 10 }, (_, i) => ({
      code: `SAN_TRUOC-${String(i + 1).padStart(2, '0')}`,
      name: `Bàn ${i + 1}`,
      maxCapacity: 4,
    })),
  },
  {
    code: 'TRONG_NHA',
    name: 'Khu vực ngồi trong nhà',
    maxCapacity: 24,
    sortOrder: 4,
    tables: Array.from({ length: 6 }, (_, i) => ({
      code: `TRONG_NHA-${String(i + 1).padStart(2, '0')}`,
      name: `Bàn ${i + 1}`,
      maxCapacity: 4,
    })),
  },
  {
    code: 'PHONG_VIP',
    name: 'Khu phòng VIP',
    maxCapacity: 12,
    sortOrder: 5,
    tables: [
      { code: 'PHONG_VIP-01', name: 'Bàn dài VIP', maxCapacity: 12 },
    ],
  },
];

const SLOTS = [
  { name: 'Buổi trưa (11h-14h)', startTime: '11:00', endTime: '14:00' },
  { name: 'Buổi tối (18h-22h)', startTime: '18:00', endTime: '22:00' },
];

export async function seedBbqAreas(prisma: PrismaClient): Promise<void> {
  for (const def of AREAS) {
    const area = await prisma.bbqArea.upsert({
      where: { code: def.code },
      update: {},
      create: {
        code: def.code,
        name: def.name,
        minCapacity: 1,
        maxCapacity: def.maxCapacity,
        status: 'ACTIVE',
        sortOrder: def.sortOrder,
      },
    });

    for (const tbl of def.tables) {
      await prisma.bbqTable.upsert({
        where: { code: tbl.code },
        update: {},
        create: {
          areaId: area.id,
          code: tbl.code,
          name: tbl.name,
          minCapacity: 1,
          maxCapacity: tbl.maxCapacity,
          status: 'ACTIVE',
          turnaroundMinutes: 30,
        },
      });
    }
  }

  const existingSlots = await prisma.bbqServiceSlot.findMany({
    where: { areaId: null, status: 'ACTIVE' },
  });

  if (existingSlots.length === 0) {
    for (const slot of SLOTS) {
      await prisma.bbqServiceSlot.create({
        data: {
          areaId: null,
          name: slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          bookingIntervalMinutes: null,
          maxTotalGuests: null,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          dateFrom: null,
          dateTo: null,
          status: 'ACTIVE',
        },
      });
    }
  }

  console.log(`BBQ areas seeded: ${AREAS.length} areas, ${AREAS.reduce((s, a) => s + a.tables.length, 0)} tables, ${SLOTS.length} service slots.`);
}
