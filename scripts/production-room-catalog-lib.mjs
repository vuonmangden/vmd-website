export const PRODUCTION_ROOM_CATALOG_VERSION = '2026-09-01.v1';
export const PRODUCTION_ROOM_CATALOG_SETTING_KEY = 'room.catalog.production';
export const PRODUCTION_ROOM_CATALOG_EFFECTIVE_FROM = '2026-09-01';
export const PRODUCTION_ROOM_CATALOG_DATE_TO = '9999-12-31';
export const PRODUCTION_ROOM_WEEKDAY_DAYS = Object.freeze([0, 1, 2, 3, 4]);
export const PRODUCTION_ROOM_WEEKEND_DAYS = Object.freeze([5, 6]);
export const PRODUCTION_ROOM_EXTRA_MATTRESS = Object.freeze({
  maxPerRoom: 1,
  guestCapacityPerMattress: 1,
  price: 200_000,
  currency: 'VND',
});

export const PRODUCTION_ROOM_CATALOG = Object.freeze([
  room('201', 'Double Lake Window', 'double-lake-window', 2, 3, 550_000, 650_000, 780_000),
  room('202', 'Family Loft Balcony', 'family-loft-balcony', 4, 5, 800_000, 900_000, 1_080_000),
  room('203', 'Double City View', 'double-city-view', 2, 3, 500_000, 600_000, 720_000),
  room('204', 'Double Balcony', 'double-balcony', 2, 3, 550_000, 650_000, 780_000),
  room('205', 'Garden View', 'garden-view', 2, 3, 600_000, 700_000, 840_000),
  room('206', 'Premium Garden View', 'premium-garden-view', 2, 3, 700_000, 800_000, 960_000),
  room('207', 'Premium Balcony View', 'premium-balcony-view', 2, 3, 700_000, 800_000, 960_000),
  Object.freeze({
    roomNumber: '301',
    roomTypeId: uuid('3001'),
    roomId: uuid('4001'),
    roomTypeCode: 'ROOM-TYPE-301',
    name: 'Dorm',
    slug: 'dorm-301',
    standardAdults: 16,
    maxAdults: 16,
    maxChildren: 0,
    maxTotalGuests: 16,
    status: 'INACTIVE',
    floor: '2',
    rates: null,
  }),
]);

export const PRODUCTION_ROOM_CATALOG_METADATA = Object.freeze({
  version: PRODUCTION_ROOM_CATALOG_VERSION,
  effectiveFrom: PRODUCTION_ROOM_CATALOG_EFFECTIVE_FROM,
  pricesIncludeVat: false,
  weekdayDays: PRODUCTION_ROOM_WEEKDAY_DAYS,
  weekendDays: PRODUCTION_ROOM_WEEKEND_DAYS,
  weekdayRulePriority: 10,
  holidayRulePriority: 100,
  extraMattress: PRODUCTION_ROOM_EXTRA_MATTRESS,
  holidayPrices: Object.freeze(
    Object.fromEntries(
      PRODUCTION_ROOM_CATALOG.filter((entry) => entry.rates !== null).map((entry) => [
        entry.roomNumber,
        entry.rates.holiday,
      ]),
    ),
  ),
  source: 'docs/09_MILESTONE_0_INPUT_PACK.md#3a-snapshot-van-hanh-uu-tien-hien-hanh--2026-09-01',
});

/**
 * Applies the owner-approved room catalog once. Re-running the same version is
 * deliberately a no-op so a deployment cannot overwrite later CMS changes.
 * A different version fails closed and requires an explicit catalog migration.
 */
export async function applyProductionRoomCatalog(prisma) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.appSetting.findUnique({
      where: { key: PRODUCTION_ROOM_CATALOG_SETTING_KEY },
      select: { value: true },
    });
    const existingVersion = catalogVersion(existing?.value);

    if (existingVersion === PRODUCTION_ROOM_CATALOG_VERSION) {
      return result(false);
    }
    if (existing !== null) {
      throw new Error(
        `ROOM_CATALOG_VERSION_CONFLICT: expected no marker or ${PRODUCTION_ROOM_CATALOG_VERSION}, received ${existingVersion ?? 'invalid marker'}`,
      );
    }

    for (const entry of PRODUCTION_ROOM_CATALOG) {
      const roomType = await transaction.roomType.upsert({
        where: { code: entry.roomTypeCode },
        update: roomTypeData(entry),
        create: { id: entry.roomTypeId, code: entry.roomTypeCode, ...roomTypeData(entry) },
        select: { id: true },
      });

      await transaction.room.upsert({
        where: { code: entry.roomNumber },
        update: physicalRoomData(entry, roomType.id),
        create: { id: entry.roomId, code: entry.roomNumber, ...physicalRoomData(entry, roomType.id) },
      });

      if (entry.rates !== null) {
        await upsertRateRule(transaction, entry, roomType.id, 'weekday');
        await upsertRateRule(transaction, entry, roomType.id, 'weekend');
      }
    }

    await transaction.appSetting.create({
      data: {
        key: PRODUCTION_ROOM_CATALOG_SETTING_KEY,
        value: PRODUCTION_ROOM_CATALOG_METADATA,
        category: 'room',
        isSecretReference: false,
      },
    });

    return result(true);
  });
}

function room(roomNumber, name, slug, standardAdults, maxTotalGuests, weekday, weekend, holiday) {
  return Object.freeze({
    roomNumber,
    roomTypeId: uuid(`3${roomNumber}`),
    roomId: uuid(`4${roomNumber}`),
    roomTypeCode: `ROOM-TYPE-${roomNumber}`,
    name,
    slug,
    standardAdults,
    maxAdults: maxTotalGuests,
    maxChildren: 1,
    maxTotalGuests,
    status: 'ACTIVE',
    floor: '2',
    rates: Object.freeze({ weekday, weekend, holiday }),
  });
}

function uuid(suffix) {
  return `10000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
}

function rateRuleId(roomNumber, kind) {
  const lane = kind === 'weekday' ? '51' : '52';
  return uuid(`${lane}${roomNumber}`);
}

function roomTypeData(entry) {
  return {
    name: entry.name,
    slug: entry.slug,
    shortDescription: null,
    description: null,
    standardAdults: entry.standardAdults,
    maxAdults: entry.maxAdults,
    maxChildren: entry.maxChildren,
    maxTotalGuests: entry.maxTotalGuests,
    bedConfiguration: [],
    amenities: [],
    status: entry.status,
    sortOrder: Number(entry.roomNumber),
    deletedAt: null,
  };
}

function physicalRoomData(entry, roomTypeId) {
  return {
    roomTypeId,
    name: `Phòng ${entry.roomNumber}`,
    floor: entry.floor,
    areaZone: null,
    status: entry.status,
    maintenanceNotes: null,
    deletedAt: null,
  };
}

async function upsertRateRule(transaction, entry, roomTypeId, kind) {
  const isWeekday = kind === 'weekday';
  const data = {
    roomTypeId,
    name: `${entry.roomNumber} — ${isWeekday ? 'Ngày thường (CN–T5)' : 'Cuối tuần (T6–T7)'}`,
    dateFrom: new Date(`${PRODUCTION_ROOM_CATALOG_EFFECTIVE_FROM}T00:00:00.000Z`),
    dateTo: new Date(`${PRODUCTION_ROOM_CATALOG_DATE_TO}T00:00:00.000Z`),
    daysOfWeek: isWeekday ? [...PRODUCTION_ROOM_WEEKDAY_DAYS] : [...PRODUCTION_ROOM_WEEKEND_DAYS],
    nightlyPrice: BigInt(isWeekday ? entry.rates.weekday : entry.rates.weekend),
    extraAdultPrice: BigInt(PRODUCTION_ROOM_EXTRA_MATTRESS.price),
    extraChildPrice: 0n,
    minNights: 1,
    maxNights: null,
    priority: 10,
    status: 'ACTIVE',
  };
  const id = rateRuleId(entry.roomNumber, kind);
  await transaction.roomRateRule.upsert({ where: { id }, update: data, create: { id, ...data } });
}

function catalogVersion(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return typeof value.version === 'string' ? value.version : null;
}

function result(applied) {
  return {
    applied,
    version: PRODUCTION_ROOM_CATALOG_VERSION,
    roomTypeCount: PRODUCTION_ROOM_CATALOG.length,
    activeRoomCount: PRODUCTION_ROOM_CATALOG.filter((entry) => entry.status === 'ACTIVE').length,
    rateRuleCount: PRODUCTION_ROOM_CATALOG.filter((entry) => entry.rates !== null).length * 2,
  };
}
