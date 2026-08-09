import assert from 'node:assert/strict';
import test from 'node:test';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import {
  SYNTHETIC_IDS,
  SYNTHETIC_SETTING_KEYS,
  applySyntheticFixtures,
  authorizeSyntheticData,
  cleanupSyntheticFixtures,
} from './synthetic-fixtures-lib.mjs';

const connectionString = process.env['SYNTHETIC_TEST_DATABASE_URL'];

test(
  'applies fixtures idempotently and cleanup preserves non-synthetic records',
  { skip: !connectionString },
  async () => {
    const authorization = authorizeSyntheticData({
      NODE_ENV: 'test',
      ALLOW_SYNTHETIC_DATA: 'true',
      SYNTHETIC_TEST_DATABASE_URL: connectionString,
    });
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const boundaryKey = 'tst001.boundary.control';

    try {
      await prisma.appSetting.upsert({
        where: { key: boundaryKey },
        update: { value: { marker: 'NON_SYNTHETIC_CONTROL' } },
        create: {
          key: boundaryKey,
          value: { marker: 'NON_SYNTHETIC_CONTROL' },
          category: 'test-control',
          isSecretReference: false,
        },
      });

      await applySyntheticFixtures(prisma, authorization);
      await applySyntheticFixtures(prisma, authorization);

      assert.equal(await prisma.appSetting.count({ where: { key: { in: [...SYNTHETIC_SETTING_KEYS] } } }), 5);
      assert.equal(await prisma.customer.count({ where: { customerCode: SYNTHETIC_IDS.customerCode } }), 1);
      assert.equal(await prisma.notificationJob.count({ where: { id: SYNTHETIC_IDS.notificationJobId } }), 1);

      await cleanupSyntheticFixtures(prisma, authorization);

      assert.equal(await prisma.appSetting.count({ where: { key: { in: [...SYNTHETIC_SETTING_KEYS] } } }), 0);
      assert.equal(await prisma.customer.count({ where: { customerCode: SYNTHETIC_IDS.customerCode } }), 0);
      assert.equal(await prisma.notificationJob.count({ where: { id: SYNTHETIC_IDS.notificationJobId } }), 0);
      assert.equal(await prisma.appSetting.count({ where: { key: boundaryKey } }), 1);
    } finally {
      await prisma.appSetting.deleteMany({ where: { key: boundaryKey, category: 'test-control' } });
      await prisma.$disconnect();
    }
  },
);
