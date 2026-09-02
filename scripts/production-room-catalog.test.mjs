import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRODUCTION_ROOM_CATALOG,
  PRODUCTION_ROOM_CATALOG_METADATA,
  PRODUCTION_ROOM_CATALOG_SETTING_KEY,
  PRODUCTION_ROOM_CATALOG_VERSION,
  applyProductionRoomCatalog,
} from './production-room-catalog-lib.mjs';

test('catalog matches the owner-approved room inventory, capacity and prices', () => {
  assert.equal(PRODUCTION_ROOM_CATALOG.length, 8);
  const active = PRODUCTION_ROOM_CATALOG.filter((entry) => entry.status === 'ACTIVE');
  const dorm = PRODUCTION_ROOM_CATALOG.find((entry) => entry.roomNumber === '301');

  assert.deepEqual(active.map((entry) => entry.roomNumber), ['201', '202', '203', '204', '205', '206', '207']);
  assert.equal(dorm?.status, 'INACTIVE');
  assert.equal(dorm?.rates, null);
  assert.ok(PRODUCTION_ROOM_CATALOG.every((entry) => entry.floor === '2'));
  assert.deepEqual(active.map((entry) => [entry.roomNumber, entry.standardAdults, entry.maxTotalGuests]), [
    ['201', 2, 3], ['202', 4, 5], ['203', 2, 3], ['204', 2, 3],
    ['205', 2, 3], ['206', 2, 3], ['207', 2, 3],
  ]);
  assert.deepEqual(active.map((entry) => [entry.rates.weekday, entry.rates.weekend, entry.rates.holiday]), [
    [550_000, 650_000, 780_000], [800_000, 900_000, 1_080_000],
    [500_000, 600_000, 720_000], [550_000, 650_000, 780_000],
    [600_000, 700_000, 840_000], [700_000, 800_000, 960_000],
    [700_000, 800_000, 960_000],
  ]);
  assert.equal(PRODUCTION_ROOM_CATALOG_METADATA.pricesIncludeVat, false);
  assert.deepEqual(PRODUCTION_ROOM_CATALOG_METADATA.extraMattress, {
    maxPerRoom: 1, guestCapacityPerMattress: 1, price: 200_000, currency: 'VND',
  });
  assert.equal(Object.keys(PRODUCTION_ROOM_CATALOG_METADATA.holidayPrices).length, 7);
});

test('applies the catalog transactionally with deterministic production-only upserts', async () => {
  const calls = { roomTypes: [], rooms: [], rates: [], settings: [] };
  const transaction = transactionMock(calls, null);
  const prisma = { $transaction: async (operation) => operation(transaction) };

  const result = await applyProductionRoomCatalog(prisma);

  assert.deepEqual(result, {
    applied: true,
    version: PRODUCTION_ROOM_CATALOG_VERSION,
    roomTypeCount: 8,
    activeRoomCount: 7,
    rateRuleCount: 14,
  });
  assert.equal(calls.roomTypes.length, 8);
  assert.equal(calls.rooms.length, 8);
  assert.equal(calls.rates.length, 14);
  assert.equal(calls.settings.length, 1);
  assert.deepEqual(calls.settings[0].data, {
    key: PRODUCTION_ROOM_CATALOG_SETTING_KEY,
    value: PRODUCTION_ROOM_CATALOG_METADATA,
    category: 'room',
    isSecretReference: false,
  });
  assert.ok(calls.roomTypes.every((call) => !JSON.stringify(call).includes('SYNTHETIC')));
  assert.ok(calls.rooms.every((call) => call.create.floor === '2'));
  assert.equal(calls.roomTypes.find((call) => call.where.code === 'ROOM-TYPE-301')?.create.status, 'INACTIVE');
  assert.deepEqual(calls.rates[0].create.daysOfWeek, [0, 1, 2, 3, 4]);
  assert.deepEqual(calls.rates[1].create.daysOfWeek, [5, 6]);
  assert.ok(calls.rates.every((call) => call.create.rateType === 'STANDARD'));
  assert.equal(calls.rates[0].create.extraAdultPrice, 200_000n);
});

test('same-version seed is a no-op and preserves later CMS changes', async () => {
  const calls = { roomTypes: [], rooms: [], rates: [], settings: [] };
  const transaction = transactionMock(calls, { value: { version: PRODUCTION_ROOM_CATALOG_VERSION } });
  const prisma = { $transaction: async (operation) => operation(transaction) };

  const result = await applyProductionRoomCatalog(prisma);

  assert.equal(result.applied, false);
  assert.deepEqual(calls, { roomTypes: [], rooms: [], rates: [], settings: [] });
});

test('a different or malformed marker fails closed instead of overwriting catalog data', async () => {
  for (const value of [{ version: 'future-version' }, { unexpected: true }]) {
    const calls = { roomTypes: [], rooms: [], rates: [], settings: [] };
    const transaction = transactionMock(calls, { value });
    const prisma = { $transaction: async (operation) => operation(transaction) };
    await assert.rejects(() => applyProductionRoomCatalog(prisma), /ROOM_CATALOG_VERSION_CONFLICT/);
    assert.deepEqual(calls, { roomTypes: [], rooms: [], rates: [], settings: [] });
  }
});

function transactionMock(calls, marker) {
  return {
    appSetting: {
      findUnique: async () => marker,
      create: async (value) => calls.settings.push(value),
    },
    roomType: {
      upsert: async (value) => {
        calls.roomTypes.push(value);
        return { id: value.create.id };
      },
    },
    room: { upsert: async (value) => calls.rooms.push(value) },
    roomRateRule: { upsert: async (value) => calls.rates.push(value) },
  };
}
