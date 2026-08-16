import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env['DATABASE_URL'] ?? '';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const APP_SETTINGS = [
  { key: 'app.name', value: 'Vườn Măng Đen', category: 'general' },
  { key: 'app.timezone', value: 'Asia/Ho_Chi_Minh', category: 'general' },
  { key: 'app.currency', value: 'VND', category: 'general' },
  { key: 'app.locale', value: 'vi-VN', category: 'general' },
  { key: 'booking.hold_ttl_minutes', value: 15, category: 'booking' },
  { key: 'booking.max_rooms_per_booking', value: 5, category: 'booking' },
  { key: 'booking.payment_ttl_hours', value: 24, category: 'booking' },
  { key: 'bbq.payment_ttl_hours', value: 12, category: 'booking' },
  { key: 'notification.reminder_days', value: [7, 3, 1], category: 'notification' },
  { key: 'notification.from_email', value: 'noreply@vuonmangden.vn', category: 'notification' },
];

const SAMPLE_CUSTOMERS = [
  {
    customerCode: 'VMD-SEED-0001',
    fullName: 'Nguyễn Văn Anh',
    phoneNormalized: '+84901234567',
    emailNormalized: 'nguyenvananh@example.com',
    source: 'DIRECT',
    marketingConsent: true,
    notes: 'Seed data — khách mẫu để kiểm thử',
  },
  {
    customerCode: 'VMD-SEED-0002',
    fullName: 'Trần Thị Bình',
    phoneNormalized: '+84912345678',
    emailNormalized: 'tranthibinh@example.com',
    source: 'WEBSITE',
    marketingConsent: false,
    notes: 'Seed data — khách mẫu để kiểm thử',
  },
];

async function seedAppSettings(): Promise<void> {
  for (const setting of APP_SETTINGS) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value as never,
        category: setting.category,
        isSecretReference: false,
      },
    });
  }
  console.log(`Seeded ${APP_SETTINGS.length} app_settings.`);
}

async function seedCustomers(): Promise<void> {
  for (const customer of SAMPLE_CUSTOMERS) {
    await prisma.customer.upsert({
      where: { customerCode: customer.customerCode },
      update: {},
      create: customer,
    });
  }
  console.log(`Seeded ${SAMPLE_CUSTOMERS.length} sample customers.`);
}

async function main(): Promise<void> {
  await seedAppSettings();
  await seedCustomers();
  console.log('Seed completed.');
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
