import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SYNTHETIC_IDS,
  SYNTHETIC_SETTING_KEYS,
  applySyntheticFixtures,
  authorizeSyntheticData,
  cleanupSyntheticFixtures,
} from './synthetic-fixtures-lib.mjs';

const safeEnvironment = {
  NODE_ENV: 'test',
  ALLOW_SYNTHETIC_DATA: 'true',
  DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:5432/vmd_synthetic_test',
};

test('rejects synthetic fixtures without explicit opt-in', () => {
  assert.throws(
    () => authorizeSyntheticData({ NODE_ENV: 'test', DATABASE_URL: safeEnvironment.DATABASE_URL }),
    /ALLOW_SYNTHETIC_DATA=true/,
  );
});

test('rejects synthetic fixtures in production even with opt-in', () => {
  assert.throws(
    () => authorizeSyntheticData({ ...safeEnvironment, NODE_ENV: 'production' }),
    /forbidden in production-equivalent environments/,
  );
});

test('rejects production when another environment variable claims test', () => {
  assert.throws(
    () => authorizeSyntheticData({ ...safeEnvironment, APP_ENV: 'test', NODE_ENV: 'production' }),
    /forbidden in production-equivalent environments/,
  );
});

test('rejects remote database without a non-production database name', () => {
  assert.throws(
    () =>
      authorizeSyntheticData({
        ...safeEnvironment,
        DATABASE_URL: 'postgresql://synthetic:synthetic@db.example.com:5432/postgres',
      }),
    /loopback or explicitly dev\/test\/demo\/local database/,
  );
});

test('accepts explicit test environment and returns an opaque authorization', () => {
  const authorization = authorizeSyntheticData(safeEnvironment);
  assert.equal(authorization.marker, 'SYNTHETIC');
  assert.equal(authorization.connectionString, safeEnvironment.DATABASE_URL);
});

test('fixture operations reject calls without authorization', async () => {
  const prisma = { $transaction: async () => undefined };
  await assert.rejects(() => applySyntheticFixtures(prisma), /requires a valid non-production authorization/);
  await assert.rejects(() => cleanupSyntheticFixtures(prisma), /requires a valid non-production authorization/);
});

test('apply is deterministic and uses only upserts inside one transaction', async () => {
  const calls = { settings: [], customers: [], notifications: [], roomTypes: [], rooms: [], rateRules: [], staffProfiles: [], roomBlocks: [] };
  const transaction = {
    appSetting: { upsert: async (value) => calls.settings.push(value) },
    customer: { upsert: async (value) => calls.customers.push(value) },
    notificationJob: { upsert: async (value) => calls.notifications.push(value) },
    roomType: { upsert: async (value) => calls.roomTypes.push(value) },
    room: { upsert: async (value) => calls.rooms.push(value) },
    roomRateRule: { upsert: async (value) => calls.rateRules.push(value) },
    staffProfile: { upsert: async (value) => calls.staffProfiles.push(value) },
    roomBlock: { upsert: async (value) => calls.roomBlocks.push(value) },
  };
  const prisma = { $transaction: async (operation) => operation(transaction) };
  const authorization = authorizeSyntheticData(safeEnvironment);

  const first = await applySyntheticFixtures(prisma, authorization);
  const second = await applySyntheticFixtures(prisma, authorization);

  assert.deepEqual(first, second);
  assert.equal(calls.settings.length, SYNTHETIC_SETTING_KEYS.length * 2);
  assert.equal(calls.customers.length, 2);
  assert.equal(calls.notifications.length, 2);
  assert.equal(calls.roomTypes.length, 2);
  assert.equal(calls.rooms.length, 2);
  assert.equal(calls.rateRules.length, 2);
  assert.equal(calls.staffProfiles.length, 2);
  assert.equal(calls.roomBlocks.length, 2);
  assert.equal(calls.roomTypes[0].where.code, 'SYNTHETIC-ROOM-TYPE-001');
  assert.equal(calls.customers[0].where.customerCode, SYNTHETIC_IDS.customerCode);
  assert.equal(calls.notifications[0].where.id, SYNTHETIC_IDS.notificationJobId);
});

test('cleanup targets exact synthetic markers and cannot delete unrelated rows', async () => {
  const calls = [];
  const deleted = (type) => async (input) => {
    calls.push({ type, input });
    return { count: 1 };
  };
  const transaction = {
    notificationDelivery: { deleteMany: deleted('delivery') },
    notificationJob: { deleteMany: deleted('job') },
    customer: { deleteMany: deleted('customer') },
    roomRateRule: { deleteMany: deleted('rateRule') },
    roomBlock: { deleteMany: deleted('roomBlock') },
    staffProfile: { deleteMany: deleted('staffProfile') },
    room: { deleteMany: deleted('room') },
    roomType: { deleteMany: deleted('roomType') },
    appSetting: { deleteMany: deleted('setting') },
  };
  const prisma = { $transaction: async (operation) => operation(transaction) };

  await cleanupSyntheticFixtures(prisma, authorizeSyntheticData(safeEnvironment));

  assert.deepEqual(calls[0].input.where, { id: SYNTHETIC_IDS.roomBlockId, roomId: SYNTHETIC_IDS.roomId, createdBy: SYNTHETIC_IDS.staffProfileId });
  assert.deepEqual(calls[1].input.where, { id: SYNTHETIC_IDS.roomRateRuleId, roomTypeId: SYNTHETIC_IDS.roomTypeId });
  assert.deepEqual(calls[2].input.where, { code: 'SYNTHETIC-ROOM-001', roomTypeId: SYNTHETIC_IDS.roomTypeId });
  assert.deepEqual(calls[3].input.where, { jobId: SYNTHETIC_IDS.notificationJobId });
  assert.deepEqual(calls[4].input.where, {
    id: SYNTHETIC_IDS.notificationJobId,
    deduplicationKey: SYNTHETIC_IDS.notificationDeduplicationKey,
  });
  assert.deepEqual(calls[5].input.where, {
    customerCode: SYNTHETIC_IDS.customerCode,
    source: 'SYNTHETIC',
  });
  assert.deepEqual(calls[6].input.where, {
    code: 'SYNTHETIC-ROOM-TYPE-001',
    slug: 'synthetic-room-type-001',
  });
  assert.deepEqual(calls[7].input.where, {
    key: { in: [...SYNTHETIC_SETTING_KEYS] },
    category: 'synthetic-fixture',
  });
  assert.deepEqual(calls[8].input.where, { id: SYNTHETIC_IDS.staffProfileId, authUserId: SYNTHETIC_IDS.staffAuthUserId, email: 'synthetic.staff.001@example.com' });
});
