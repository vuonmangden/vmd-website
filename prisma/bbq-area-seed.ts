import type { PrismaClient } from '@prisma/client';

interface AreaDef {
  code: string;
  name: string;
  sortOrder: number;
}

const AREAS: AreaDef[] = [
  { code: 'SAN-DO', name: 'Khu vực sân đỏ', sortOrder: 1 },
  { code: 'TRONG-NHA', name: 'Khu vực trong nhà', sortOrder: 2 },
  { code: 'NGOAI-SAN', name: 'Khu vực ngoài sân', sortOrder: 3 },
];

const SERVICE_SLOT = {
  name: 'Phục vụ BBQ (10:30–21:30)',
  startTime: '10:30',
  endTime: '21:30',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
};

/**
 * Production catalogue approved on 2026-09-01. Updates intentionally change
 * prior synthetic rows in place, then deactivate old areas/tables/slots so a
 * repeatable seed cannot leave public availability on the obsolete catalog.
 */
export async function seedBbqAreas(prisma: PrismaClient): Promise<void> {
  const productionCodes = new Set(AREAS.map((area) => area.code));
  for (const def of AREAS) {
    const area = await prisma.bbqArea.upsert({
      where: { code: def.code },
      update: { name: def.name, minCapacity: 2, maxCapacity: 40, status: 'ACTIVE', sortOrder: def.sortOrder, deletedAt: null },
      create: { code: def.code, name: def.name, minCapacity: 2, maxCapacity: 40, status: 'ACTIVE', sortOrder: def.sortOrder },
    });
    for (let number = 1; number <= 10; number += 1) {
      const code = `${def.code}-${String(number).padStart(2, '0')}`;
      await prisma.bbqTable.upsert({
        where: { code },
        update: { areaId: area.id, name: `Bàn ${number}`, minCapacity: 2, maxCapacity: 4, status: 'ACTIVE', turnaroundMinutes: 10, deletedAt: null },
        create: { areaId: area.id, code, name: `Bàn ${number}`, minCapacity: 2, maxCapacity: 4, status: 'ACTIVE', turnaroundMinutes: 10 },
      });
    }
  }

  await prisma.bbqArea.updateMany({
    where: { code: { notIn: [...productionCodes] }, deletedAt: null },
    data: { status: 'INACTIVE', deletedAt: new Date() },
  });
  await prisma.bbqTable.updateMany({
    where: { area: { code: { notIn: [...productionCodes] } }, deletedAt: null },
    data: { status: 'INACTIVE', deletedAt: new Date() },
  });

  await prisma.bbqServiceSlot.updateMany({
    where: { status: 'ACTIVE' },
    data: { status: 'INACTIVE' },
  });
  const existing = await prisma.bbqServiceSlot.findFirst({ where: { areaId: null, name: SERVICE_SLOT.name } });
  if (existing) {
    await prisma.bbqServiceSlot.update({ where: { id: existing.id }, data: { ...SERVICE_SLOT, bookingIntervalMinutes: null, maxTotalGuests: 120, status: 'ACTIVE', dateFrom: null, dateTo: null } });
  } else {
    await prisma.bbqServiceSlot.create({ data: { areaId: null, ...SERVICE_SLOT, bookingIntervalMinutes: null, maxTotalGuests: 120, status: 'ACTIVE', dateFrom: null, dateTo: null } });
  }
  console.log('BBQ production catalogue seeded: 3 areas, 30 active tables, one 10:30–21:30 service window, daily quota 120.');
}
