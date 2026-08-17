import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationInboxService, maskEmail, maskPhone } from './notification-inbox.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const CORRELATION_ID = '00000000-0000-4000-8000-00000000000e';

const ACTOR: AuthenticatedActor = {
  staffProfileId: '00000000-0000-4000-8000-000000000001',
  authUserId: '00000000-0000-4000-8000-000000000002',
  fullName: 'Test Staff',
  email: 'staff@example.com',
  roles: ['MANAGER'],
  permissions: ['report.read', 'content.manage'],
};

const JOB_ROW = {
  id: 'job-1',
  templateCode: 'booking.confirmed',
  recipientType: 'CUSTOMER',
  recipientReferenceId: 'customer-1',
  email: 'guest@example.com',
  phone: '+84901234567',
  status: 'failed',
  attemptCount: 5,
  lastError: 'SMTP 550',
  scheduledAt: new Date('2026-08-16T00:00:00Z'),
  createdAt: new Date('2026-08-16T00:00:00Z'),
  completedAt: null,
};

function prismaMock(status = 'failed') {
  const notificationJob = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ status, attemptCount: 5 }),
    update: jest.fn().mockResolvedValue({ id: 'job-1', status: 'pending', attemptCount: 5 }),
    count: jest.fn().mockResolvedValue(0),
  };
  const auditLog = { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const tx = { notificationJob, auditLog };
  return {
    notificationJob,
    auditLog,
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : [[], 0],
    ),
  };
}

describe('NotificationInboxService.list', () => {
  it('defaults to failed jobs', async () => {
    const prisma = prismaMock();
    const service = new NotificationInboxService(prisma as never);

    await service.list({ page: 1, pageSize: 50 });

    expect(prisma.notificationJob.findMany.mock.calls[0][0].where).toEqual({ status: 'failed' });
  });

  it('accepts the other inbox statuses', async () => {
    const prisma = prismaMock();
    const service = new NotificationInboxService(prisma as never);

    await service.list({ status: 'pending', page: 1, pageSize: 50 });

    expect(prisma.notificationJob.findMany.mock.calls[0][0].where).toEqual({ status: 'pending' });
  });

  it('rejects an unknown status filter', async () => {
    const service = new NotificationInboxService(prismaMock() as never);
    await expect(
      service.list({ status: 'sent', page: 1, pageSize: 50 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('masks recipient details', async () => {
    const prisma = prismaMock();
    prisma.$transaction = jest.fn().mockResolvedValue([[JOB_ROW], 1]);
    const service = new NotificationInboxService(prisma as never);

    const result = await service.list({ page: 1, pageSize: 50 });

    expect(result.items[0]?.emailMasked).toBe('gue***@example.com');
    expect(result.items[0]?.phoneMasked).toBe('****4567');
    expect(JSON.stringify(result)).not.toContain('guest@example.com');
    expect(JSON.stringify(result)).not.toContain('+84901234567');
  });

  it('keeps the failure reason and attempt count visible', async () => {
    const prisma = prismaMock();
    prisma.$transaction = jest.fn().mockResolvedValue([[JOB_ROW], 1]);
    const service = new NotificationInboxService(prisma as never);

    const result = await service.list({ page: 1, pageSize: 50 });

    expect(result.items[0]?.lastError).toBe('SMTP 550');
    expect(result.items[0]?.attemptCount).toBe(5);
  });

  it('paginates', async () => {
    const prisma = prismaMock();
    const service = new NotificationInboxService(prisma as never);

    await service.list({ page: 3, pageSize: 20 });

    expect(prisma.notificationJob.findMany.mock.calls[0][0].skip).toBe(40);
  });
});

describe('NotificationInboxService.retry', () => {
  it('requeues a failed job and clears the error', async () => {
    const prisma = prismaMock('failed');
    const service = new NotificationInboxService(prisma as never);

    const result = await service.retry(ACTOR, 'job-1', CORRELATION_ID);

    expect(result.status).toBe('pending');
    expect(prisma.notificationJob.update.mock.calls[0][0].data).toEqual({
      status: 'pending',
      lastError: null,
    });
  });

  it('preserves the attempt count so repeated retries stay visible', async () => {
    const prisma = prismaMock('failed');
    const service = new NotificationInboxService(prisma as never);

    await service.retry(ACTOR, 'job-1', CORRELATION_ID);

    expect(prisma.notificationJob.update.mock.calls[0][0].data).not.toHaveProperty('attemptCount');
  });

  it('writes the audit record inside the same transaction', async () => {
    const prisma = prismaMock('failed');
    const service = new NotificationInboxService(prisma as never);

    await service.retry(ACTOR, 'job-1', CORRELATION_ID);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'STAFF',
        actorId: '00000000-0000-4000-8000-000000000001',
        action: 'notification.retry',
        resourceType: 'notification_job',
        resourceId: 'job-1',
        beforeData: { status: 'failed', attemptCount: 5 },
        afterData: { status: 'pending' },
        correlationId: CORRELATION_ID,
      }),
    });
  });

  it('refuses to retry a job that has not failed', async () => {
    for (const status of ['pending', 'processing', 'sent', 'cancelled']) {
      const service = new NotificationInboxService(prismaMock(status) as never);
      await expect(service.retry(ACTOR, 'job-1', CORRELATION_ID)).rejects.toThrow(
        BadRequestException,
      );
    }
  });

  it('returns 404 for an unknown job', async () => {
    const prisma = prismaMock();
    prisma.notificationJob.findUnique.mockResolvedValue(null);
    const service = new NotificationInboxService(prisma as never);

    await expect(service.retry(ACTOR, 'missing', CORRELATION_ID)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('masking helpers', () => {
  it('masks emails and phones, passing through nulls', () => {
    expect(maskEmail('guest@example.com')).toBe('gue***@example.com');
    expect(maskEmail(null)).toBeNull();
    expect(maskPhone('+84901234567')).toBe('****4567');
    expect(maskPhone(null)).toBeNull();
  });
});
