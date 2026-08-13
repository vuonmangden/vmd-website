import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { applySyntheticFixtures, authorizeSyntheticData } from '../scripts/synthetic-fixtures-lib.mjs';
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

  await seedRbac(prisma);

  console.log('Seed completed: app_settings smoke record and approved RBAC matrix inserted.');

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
