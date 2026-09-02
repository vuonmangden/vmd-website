import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { applySyntheticFixtures, authorizeSyntheticData } from '../scripts/synthetic-fixtures-lib.mjs';
import { applyProductionRoomCatalog } from '../scripts/production-room-catalog-lib.mjs';
import { seedBbqAreas } from './bbq-area-seed';
import { seedBbqMenu } from './bbq-menu-seed';
import { seedRbac } from './rbac-seed';

const connectionString = process.env['DATABASE_URL'] ?? '';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  const syntheticAuthorization =
    process.env['ALLOW_SYNTHETIC_DATA'] === undefined ? null : authorizeSyntheticData(process.env);

  await prisma.appSetting.upsert({
    where: { key: 'app.name' },
    update: {},
    create: {
      key: 'app.name',
      value: 'Vườn Măng Đen',
      category: 'general',
      isSecretReference: false,
    },
  });

  for (const [key, hours] of [['payment.expiry_hours.room', 24], ['payment.expiry_hours.bbq', 12]] as const) {
    await prisma.appSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: { hours }, category: 'payment', isSecretReference: false },
    });
  }

  // BBQ online requests have no deposit as confirmed on 2026-09-01. Keep the
  // historical setting explicit so obsolete sandbox code cannot silently use it.
  await prisma.appSetting.upsert({
    where: { key: 'bbq.deposit_amount_per_table' },
    update: { value: { amount: 0 } },
    create: {
      key: 'bbq.deposit_amount_per_table',
      value: { amount: 0 },
      category: 'bbq',
      isSecretReference: false,
    },
  });

  await seedRbac(prisma);
  const roomCatalog = await applyProductionRoomCatalog(prisma);
  await seedBbqAreas(prisma);
  await seedBbqMenu(prisma);

  console.log(
    `Production room catalog ${roomCatalog.applied ? 'applied' : 'already current'}: version=${roomCatalog.version}, activeRooms=${roomCatalog.activeRoomCount}, rateRules=${roomCatalog.rateRuleCount}.`,
  );
  console.log('Seed completed: app_settings, RBAC matrix, production rooms/rates, BBQ areas, and BBQ menu inserted.');

  if (!syntheticAuthorization) {
    console.log('Synthetic fixtures skipped: set an explicit non-production environment and ALLOW_SYNTHETIC_DATA=true.');
    return;
  }

  const result = await applySyntheticFixtures(prisma, syntheticAuthorization);
  console.log(
    `Synthetic fixtures applied: marker=${result.marker}, settings=${result.settingCount}, customer=${result.customerCode}.`,
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
