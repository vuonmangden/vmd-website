const authorizationMarker = Symbol('synthetic-fixture-authorization');

export const SYNTHETIC_MARKER = 'SYNTHETIC';
export const SYNTHETIC_FIXTURE_VERSION = 1;

export const SYNTHETIC_IDS = Object.freeze({
  customerId: '00000000-0000-4000-8000-000000000001',
  customerCode: 'SYNTHETIC-CUSTOMER-001',
  notificationJobId: '00000000-0000-4000-8000-000000000002',
  notificationDeduplicationKey: 'SYNTHETIC:notification:welcome:001',
  roomTypeId: '00000000-0000-4000-8000-000000000003',
  roomId: '00000000-0000-4000-8000-000000000004',
  roomRateRuleId: '00000000-0000-4000-8000-000000000005',
  staffProfileId: '00000000-0000-4000-8000-000000000006',
  staffAuthUserId: '00000000-0000-4000-8000-000000000007',
  roomBlockId: '00000000-0000-4000-8000-000000000008',
});

const allowedEnvironments = new Set(['development', 'test', 'local', 'demo']);
const blockedEnvironments = new Set(['production', 'prod', 'staging', 'live']);

export const SYNTHETIC_SETTING_KEYS = Object.freeze([
  'synthetic.fixture.registry',
  'synthetic.fixture.room-types',
  'synthetic.fixture.rate-policy',
  'synthetic.fixture.roles',
  'synthetic.fixture.notification-template',
]);

const normalize = (value) => value?.trim().toLowerCase() ?? '';

const databaseLooksNonProduction = (databaseUrl) => {
  const parsed = new URL(databaseUrl);
  const hostname = normalize(parsed.hostname);
  const database = normalize(parsed.pathname.replace(/^\//, ''));
  const isLoopback = hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1';
  const hasNonProductionName = /(^|[-_])(dev|test|demo|local)([-_]|$)/.test(database);
  return isLoopback || hasNonProductionName;
};

export function authorizeSyntheticData(environment = process.env) {
  const runtimeEnvironments = ['APP_ENV', 'DEPLOYMENT_ENV', 'NODE_ENV']
    .map((key) => normalize(environment[key]))
    .filter(Boolean);
  const providerEnvironment = normalize(environment['VERCEL_ENV']);

  if (runtimeEnvironments.some((value) => blockedEnvironments.has(value)) || providerEnvironment === 'production') {
    throw new Error('Synthetic fixtures are forbidden in production-equivalent environments.');
  }

  if (!runtimeEnvironments.some((value) => allowedEnvironments.has(value))) {
    throw new Error('Synthetic fixtures require APP_ENV, DEPLOYMENT_ENV or NODE_ENV to be explicitly non-production.');
  }

  if (environment['ALLOW_SYNTHETIC_DATA'] !== 'true') {
    throw new Error('Synthetic fixtures require ALLOW_SYNTHETIC_DATA=true.');
  }

  const connectionString = environment['SYNTHETIC_TEST_DATABASE_URL'] ?? environment['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('Synthetic fixtures require an explicit database URL.');
  }

  let safeDatabase;
  try {
    safeDatabase = databaseLooksNonProduction(connectionString);
  } catch {
    throw new Error('Synthetic fixture database URL is invalid.');
  }

  if (!safeDatabase) {
    throw new Error('Synthetic fixtures require a loopback or explicitly dev/test/demo/local database.');
  }

  return Object.freeze({
    connectionString,
    marker: SYNTHETIC_MARKER,
    [authorizationMarker]: true,
  });
}

const requireAuthorization = (authorization) => {
  if (authorization?.[authorizationMarker] !== true) {
    throw new Error('Synthetic fixture operation requires a valid non-production authorization.');
  }
};

const appSettings = [
  {
    key: 'synthetic.fixture.registry',
    value: {
      marker: SYNTHETIC_MARKER,
      version: SYNTHETIC_FIXTURE_VERSION,
      purpose: 'LOCAL_DEV_TEST_INTERNAL_DEMO_ONLY',
      replacesProductionData: false,
    },
  },
  {
    key: 'synthetic.fixture.room-types',
    value: {
      marker: SYNTHETIC_MARKER,
      items: [
        { code: 'SYNTHETIC-ROOM-TYPE-001', name: 'SYNTHETIC Room Type 001', capacity: 2 },
        { code: 'SYNTHETIC-ROOM-TYPE-002', name: 'SYNTHETIC Room Type 002', capacity: 4 },
      ],
    },
  },
  {
    key: 'synthetic.fixture.rate-policy',
    value: {
      marker: SYNTHETIC_MARKER,
      currency: 'VND',
      nightlyAmount: 1000000,
      depositAmount: 500000,
      policy: 'SYNTHETIC_NOT_FOR_PRODUCTION',
    },
  },
  {
    key: 'synthetic.fixture.roles',
    value: {
      marker: SYNTHETIC_MARKER,
      items: ['SYNTHETIC_SUPER_ADMIN', 'SYNTHETIC_OPERATIONS', 'SYNTHETIC_ACCOUNTANT'],
    },
  },
  {
    key: 'synthetic.fixture.notification-template',
    value: {
      marker: SYNTHETIC_MARKER,
      code: 'SYNTHETIC_BOOKING_CONFIRMATION',
      recipient: 'synthetic.guest.001@example.com',
      enabledForExternalDelivery: false,
    },
  },
].map((setting) => ({ ...setting, category: 'synthetic-fixture', isSecretReference: false }));

export async function applySyntheticFixtures(prisma, authorization) {
  requireAuthorization(authorization);

  return prisma.$transaction(async (transaction) => {
    for (const setting of appSettings) {
      await transaction.appSetting.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          category: setting.category,
          isSecretReference: setting.isSecretReference,
        },
        create: setting,
      });
    }

    await transaction.customer.upsert({
      where: { customerCode: SYNTHETIC_IDS.customerCode },
      update: {
        fullName: 'SYNTHETIC Guest 001',
        emailNormalized: 'synthetic.guest.001@example.com',
        phoneNormalized: null,
        source: SYNTHETIC_MARKER,
        marketingConsent: false,
        privacyConsentAt: null,
        notes: 'SYNTHETIC local/dev/test/internal-demo fixture only.',
        deletedAt: null,
      },
      create: {
        id: SYNTHETIC_IDS.customerId,
        customerCode: SYNTHETIC_IDS.customerCode,
        fullName: 'SYNTHETIC Guest 001',
        emailNormalized: 'synthetic.guest.001@example.com',
        phoneNormalized: null,
        source: SYNTHETIC_MARKER,
        marketingConsent: false,
        privacyConsentAt: null,
        notes: 'SYNTHETIC local/dev/test/internal-demo fixture only.',
      },
    });

    await transaction.notificationJob.upsert({
      where: { id: SYNTHETIC_IDS.notificationJobId },
      update: {
        payload: { marker: SYNTHETIC_MARKER, deliverExternally: false },
        status: 'synthetic_fixture',
      },
      create: {
        id: SYNTHETIC_IDS.notificationJobId,
        templateCode: 'SYNTHETIC_BOOKING_CONFIRMATION',
        recipientType: 'customer',
        recipientReferenceId: SYNTHETIC_IDS.customerId,
        email: 'synthetic.guest.001@example.com',
        phone: null,
        payload: { marker: SYNTHETIC_MARKER, deliverExternally: false },
        scheduledAt: new Date('2099-01-01T00:00:00.000Z'),
        status: 'synthetic_fixture',
        deduplicationKey: SYNTHETIC_IDS.notificationDeduplicationKey,
      },
    });

    await transaction.roomType.upsert({
      where: { code: 'SYNTHETIC-ROOM-TYPE-001' },
      update: syntheticRoomType(),
      create: { id: SYNTHETIC_IDS.roomTypeId, ...syntheticRoomType() },
    });
    await transaction.room.upsert({
      where: { code: 'SYNTHETIC-ROOM-001' },
      update: syntheticRoom(),
      create: { id: SYNTHETIC_IDS.roomId, ...syntheticRoom() },
    });
    await transaction.roomRateRule.upsert({
      where: { id: SYNTHETIC_IDS.roomRateRuleId },
      update: syntheticRoomRateRule(),
      create: { id: SYNTHETIC_IDS.roomRateRuleId, ...syntheticRoomRateRule() },
    });
    await transaction.staffProfile.upsert({
      where: { authUserId: SYNTHETIC_IDS.staffAuthUserId },
      update: syntheticStaffProfile(),
      create: { id: SYNTHETIC_IDS.staffProfileId, ...syntheticStaffProfile() },
    });
    await transaction.roomBlock.upsert({
      where: { id: SYNTHETIC_IDS.roomBlockId },
      update: syntheticRoomBlock(),
      create: { id: SYNTHETIC_IDS.roomBlockId, ...syntheticRoomBlock() },
    });

    return {
      marker: SYNTHETIC_MARKER,
      settingCount: appSettings.length,
      customerCode: SYNTHETIC_IDS.customerCode,
      notificationJobId: SYNTHETIC_IDS.notificationJobId,
      roomTypeCode: 'SYNTHETIC-ROOM-TYPE-001',
      roomCode: 'SYNTHETIC-ROOM-001',
      roomRateRuleId: SYNTHETIC_IDS.roomRateRuleId,
      roomBlockId: SYNTHETIC_IDS.roomBlockId,
    };
  });
}

export async function cleanupSyntheticFixtures(prisma, authorization) {
  requireAuthorization(authorization);

  return prisma.$transaction(async (transaction) => {
    const roomBlocks = await transaction.roomBlock.deleteMany({
      where: { id: SYNTHETIC_IDS.roomBlockId, roomId: SYNTHETIC_IDS.roomId, createdBy: SYNTHETIC_IDS.staffProfileId },
    });
    const roomRateRules = await transaction.roomRateRule.deleteMany({
      where: { id: SYNTHETIC_IDS.roomRateRuleId, roomTypeId: SYNTHETIC_IDS.roomTypeId },
    });
    const rooms = await transaction.room.deleteMany({
      where: { code: 'SYNTHETIC-ROOM-001', roomTypeId: SYNTHETIC_IDS.roomTypeId },
    });
    await transaction.notificationDelivery.deleteMany({
      where: { jobId: SYNTHETIC_IDS.notificationJobId },
    });
    const notificationJobs = await transaction.notificationJob.deleteMany({
      where: {
        id: SYNTHETIC_IDS.notificationJobId,
        deduplicationKey: SYNTHETIC_IDS.notificationDeduplicationKey,
      },
    });
    const customers = await transaction.customer.deleteMany({
      where: {
        customerCode: SYNTHETIC_IDS.customerCode,
        source: SYNTHETIC_MARKER,
      },
    });
    const roomTypes = await transaction.roomType.deleteMany({
      where: { code: 'SYNTHETIC-ROOM-TYPE-001', slug: 'synthetic-room-type-001' },
    });
    const settings = await transaction.appSetting.deleteMany({
      where: {
        key: { in: [...SYNTHETIC_SETTING_KEYS] },
        category: 'synthetic-fixture',
      },
    });
    const staffProfiles = await transaction.staffProfile.deleteMany({
      where: { id: SYNTHETIC_IDS.staffProfileId, authUserId: SYNTHETIC_IDS.staffAuthUserId, email: 'synthetic.staff.001@example.com' },
    });

    return {
      notificationJobs: notificationJobs.count,
      customers: customers.count,
      roomTypes: roomTypes.count,
      rooms: rooms.count,
      roomRateRules: roomRateRules.count,
      roomBlocks: roomBlocks.count,
      staffProfiles: staffProfiles.count,
      settings: settings.count,
    };
  });
}

function syntheticRoomType() {
  return {
    code: 'SYNTHETIC-ROOM-TYPE-001',
    name: 'SYNTHETIC Room Type 001',
    slug: 'synthetic-room-type-001',
    shortDescription: 'SYNTHETIC local/dev/test/internal-demo fixture only.',
    description: 'SYNTHETIC fixture; not an offer, rate, policy or production room inventory.',
    standardAdults: 2,
    maxAdults: 2,
    maxChildren: 0,
    maxTotalGuests: 2,
    bedConfiguration: ['SYNTHETIC bed configuration'],
    amenities: ['SYNTHETIC amenity'],
    status: 'DRAFT',
    sortOrder: 1,
    deletedAt: null,
  };
}

function syntheticRoom() {
  return {
    roomTypeId: SYNTHETIC_IDS.roomTypeId,
    code: 'SYNTHETIC-ROOM-001',
    name: 'SYNTHETIC Room 001',
    floor: 'SYNTHETIC', areaZone: 'SYNTHETIC', status: 'INACTIVE',
    maintenanceNotes: 'SYNTHETIC local/dev/test/internal-demo fixture only.',
    deletedAt: null,
  };
}

function syntheticRoomRateRule() {
  return {
    roomTypeId: SYNTHETIC_IDS.roomTypeId,
    name: 'SYNTHETIC sandbox rate rule',
    dateFrom: new Date('2099-01-01T00:00:00.000Z'),
    dateTo: new Date('2099-02-01T00:00:00.000Z'),
    daysOfWeek: [], nightlyPrice: 1000000n, extraAdultPrice: 0n, extraChildPrice: 0n,
    minNights: 1, maxNights: null, priority: 0, status: 'DRAFT',
  };
}

function syntheticStaffProfile() {
  return { authUserId: SYNTHETIC_IDS.staffAuthUserId, fullName: 'SYNTHETIC Staff 001', email: 'synthetic.staff.001@example.com', status: 'ACTIVE', lastLoginAt: null };
}

function syntheticRoomBlock() {
  return { roomId: SYNTHETIC_IDS.roomId, startDate: new Date('2099-03-01T00:00:00.000Z'), endDate: new Date('2099-03-03T00:00:00.000Z'), reason: 'SYNTHETIC maintenance block', blockType: 'MAINTENANCE', createdBy: SYNTHETIC_IDS.staffProfileId, cancelledAt: null };
}
