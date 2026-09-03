import { randomUUID } from 'node:crypto';
import { NotificationDispatchService } from './notification-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * This suite is deliberately opt-in: CI does not provide a PostgreSQL service.
 * Run with RUN_POSTGRES_INTEGRATION=1 and a disposable verification DATABASE_URL.
 */
const describePostgres = process.env['RUN_POSTGRES_INTEGRATION'] === '1' ? describe : describe.skip;

describePostgres('NotificationDispatchService (PostgreSQL)', () => {
  let firstWorker: PrismaService;
  let secondWorker: PrismaService;
  let email: { send: jest.Mock };
  const jobIds: string[] = [];

  beforeAll(async () => {
    firstWorker = new PrismaService();
    secondWorker = new PrismaService();
    await Promise.all([firstWorker.$connect(), secondWorker.$connect()]);
  });

  beforeEach(() => {
    email = {
      send: jest.fn().mockImplementation(async (message: { idempotencyKey: string }) => ({
        provider: 'postgres-integration-fake',
        providerMessageId: message.idempotencyKey,
        status: 'sent' as const,
      })),
    };
  });

  afterEach(async () => {
    if (jobIds.length === 0) return;
    await firstWorker.notificationDelivery.deleteMany({ where: { jobId: { in: jobIds } } });
    await firstWorker.notificationJob.deleteMany({ where: { id: { in: jobIds } } });
    jobIds.length = 0;
  });

  afterAll(async () => {
    await Promise.all([firstWorker.$disconnect(), secondWorker.$disconnect()]);
  });

  it('allows exactly one of two workers to claim and deliver a due job', async () => {
    const job = await createEmailJob(firstWorker);
    jobIds.push(job.id);
    const one = new NotificationDispatchService(firstWorker, email as never, {} as never);
    const two = new NotificationDispatchService(secondWorker, email as never, {} as never);

    await Promise.all([one.pollAndDispatch(), two.pollAndDispatch()]);

    expect(email.send).toHaveBeenCalledTimes(1);
    expect(email.send).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: `notification:${job.id}:email`,
    }));
    await expect(firstWorker.notificationJob.findUniqueOrThrow({ where: { id: job.id } }))
      .resolves.toEqual(expect.objectContaining({ status: 'completed', attemptCount: 1 }));
    await expect(firstWorker.notificationDelivery.count({ where: { jobId: job.id, status: 'sent' } }))
      .resolves.toBe(1);
  });

  it('recovers an expired lease, but never steals a valid lease', async () => {
    const expired = await createEmailJob(firstWorker, {
      status: 'processing',
      claimToken: randomUUID(),
      processingStartedAt: new Date(Date.now() - 10 * 60_000),
      leaseExpiresAt: new Date(Date.now() - 1_000),
    });
    const valid = await createEmailJob(firstWorker, {
      status: 'processing',
      claimToken: randomUUID(),
      processingStartedAt: new Date(),
      leaseExpiresAt: new Date(Date.now() + 10 * 60_000),
    });
    jobIds.push(expired.id, valid.id);
    const worker = new NotificationDispatchService(firstWorker, email as never, {} as never);

    await expect(worker.pollAndDispatch()).resolves.toBe(1);

    expect(email.send).toHaveBeenCalledTimes(1);
    await expect(firstWorker.notificationJob.findUniqueOrThrow({ where: { id: expired.id } }))
      .resolves.toEqual(expect.objectContaining({ status: 'completed', attemptCount: 1 }));
    await expect(firstWorker.notificationJob.findUniqueOrThrow({ where: { id: valid.id } }))
      .resolves.toEqual(expect.objectContaining({ status: 'processing', attemptCount: 0 }));
  });
});

async function createEmailJob(
  prisma: PrismaService,
  overrides: Partial<{
    status: string;
    claimToken: string;
    processingStartedAt: Date;
    leaseExpiresAt: Date;
  }> = {},
) {
  return prisma.notificationJob.create({
    data: {
      templateCode: 'BOOKING_CONFIRMED_EMAIL',
      recipientType: 'booking',
      recipientReferenceId: randomUUID(),
      email: 'postgres-integration@example.test',
      payload: { subject: 'PostgreSQL integration', body: 'Notification delivery claim test' },
      scheduledAt: new Date(Date.now() - 1_000),
      deduplicationKey: `ntf007-postgres-${randomUUID()}`,
      ...overrides,
    },
  });
}
