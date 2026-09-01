import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ContactService, maskEmail, maskPhone } from './contact.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const CORRELATION_ID = '00000000-0000-4000-8000-00000000000a';

function actor(roles: string[]): AuthenticatedActor {
  return {
    staffProfileId: '00000000-0000-4000-8000-000000000001',
    authUserId: '00000000-0000-4000-8000-000000000002',
    fullName: 'Test Staff',
    email: 'staff@example.com',
    roles,
    permissions: [],
  };
}

function prismaMock() {
  const contactSubmission = {
    create: jest.fn().mockResolvedValue({ id: 'submission-1' }),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ status: 'NEW' }),
    update: jest.fn().mockResolvedValue({ id: 'submission-1', status: 'RESOLVED' }),
    count: jest.fn().mockResolvedValue(0),
  };
  const auditLog = { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const tx = { contactSubmission, auditLog };
  return {
    contactSubmission,
    auditLog,
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : [[], 0],
    ),
  };
}

const VALID_INPUT = {
  fullName: 'Nguyễn Văn A',
  email: 'guest@example.com',
  subject: 'Hỏi về phòng',
  message: 'Cho tôi hỏi còn phòng cuối tuần này không?',
};

describe('ContactService.submit', () => {
  it('stores a submission and returns only its id', async () => {
    const prisma = prismaMock();
    const service = new ContactService(prisma as never);

    const result = await service.submit(VALID_INPUT, '203.0.113.9', CORRELATION_ID);

    expect(result).toEqual({ id: 'submission-1' });
    expect(prisma.contactSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true } }),
    );
  });

  it('rejects a submission with neither email nor phone', async () => {
    const service = new ContactService(prismaMock() as never);
    await expect(
      service.submit({ ...VALID_INPUT, email: undefined }, '203.0.113.9', CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts phone alone', async () => {
    const service = new ContactService(prismaMock() as never);
    await expect(
      service.submit({ ...VALID_INPUT, email: undefined, phone: '+84901234567' }, undefined, null),
    ).resolves.toEqual({ id: 'submission-1' });
  });

  it('never stores the raw IP address', async () => {
    const prisma = prismaMock();
    const service = new ContactService(prisma as never);

    await service.submit(VALID_INPUT, '203.0.113.9', CORRELATION_ID);

    const data = prisma.contactSubmission.create.mock.calls[0][0].data;
    expect(data.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(data)).not.toContain('203.0.113.9');
  });

  it('normalises the email and trims free text', async () => {
    const prisma = prismaMock();
    const service = new ContactService(prisma as never);

    await service.submit(
      { ...VALID_INPUT, email: '  GUEST@Example.COM ', subject: '  Hỏi  ', message: '  Nội dung  ' },
      undefined,
      null,
    );

    const data = prisma.contactSubmission.create.mock.calls[0][0].data;
    expect(data.email).toBe('guest@example.com');
    expect(data.subject).toBe('Hỏi');
    expect(data.message).toBe('Nội dung');
  });

  it('drops a correlation id that is not a UUID', async () => {
    const prisma = prismaMock();
    const service = new ContactService(prisma as never);

    await service.submit(VALID_INPUT, undefined, 'not-a-uuid');

    expect(prisma.contactSubmission.create.mock.calls[0][0].data.correlationId).toBeNull();
  });
});

describe('ContactService.list', () => {
  it('denies Accountant', async () => {
    const service = new ContactService(prismaMock() as never);
    await expect(
      service.list(actor(['ACCOUNTANT']), { page: 1, pageSize: 50 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows Reception', async () => {
    const service = new ContactService(prismaMock() as never);
    await expect(
      service.list(actor(['RECEPTION']), { page: 1, pageSize: 50 }),
    ).resolves.toEqual(expect.objectContaining({ total: 0 }));
  });

  it('rejects an unknown status filter', async () => {
    const service = new ContactService(prismaMock() as never);
    await expect(
      service.list(actor(['MANAGER']), { status: 'DELETED', page: 1, pageSize: 50 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('masks contact details in the listing', async () => {
    const prisma = prismaMock();
    prisma.$transaction = jest.fn().mockResolvedValue([
      [
        {
          id: 'submission-1',
          fullName: 'Nguyễn Văn A',
          email: 'guest@example.com',
          phone: '+84901234567',
          subject: 'Hỏi về phòng',
          status: 'NEW',
          createdAt: new Date('2026-08-16T00:00:00Z'),
        },
      ],
      1,
    ]);
    const service = new ContactService(prisma as never);

    const result = await service.list(actor(['MANAGER']), { page: 1, pageSize: 50 });

    expect(result.items[0]?.emailMasked).toBe('gue***@example.com');
    expect(result.items[0]?.phoneMasked).toBe('****4567');
    expect(JSON.stringify(result)).not.toContain('guest@example.com');
    expect(JSON.stringify(result)).not.toContain('+84901234567');
  });
});

describe('ContactService.updateStatus', () => {
  it('writes the status change and its audit record together', async () => {
    const prisma = prismaMock();
    const service = new ContactService(prisma as never);

    await service.updateStatus(actor(['MANAGER']), 'submission-1', 'RESOLVED', 'Đã gọi khách', CORRELATION_ID);

    expect(prisma.contactSubmission.update).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'contact.status.updated',
        resourceType: 'contact_submission',
        beforeData: { status: 'NEW' },
        afterData: { status: 'RESOLVED' },
        correlationId: CORRELATION_ID,
      }),
    });
  });

  it('stamps the acting staff as handler', async () => {
    const prisma = prismaMock();
    const service = new ContactService(prisma as never);

    await service.updateStatus(actor(['MANAGER']), 'submission-1', 'IN_PROGRESS', undefined, CORRELATION_ID);

    const data = prisma.contactSubmission.update.mock.calls[0][0].data;
    expect(data.handledBy).toBe('00000000-0000-4000-8000-000000000001');
    expect(data.handledAt).toBeInstanceOf(Date);
  });

  it('rejects an unknown status', async () => {
    const service = new ContactService(prismaMock() as never);
    await expect(
      service.updateStatus(actor(['MANAGER']), 'submission-1', 'ARCHIVED', undefined, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns 404 for a missing submission', async () => {
    const prisma = prismaMock();
    prisma.contactSubmission.findUnique.mockResolvedValue(null);
    const service = new ContactService(prisma as never);

    await expect(
      service.updateStatus(actor(['MANAGER']), 'missing', 'RESOLVED', undefined, CORRELATION_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('denies Accountant', async () => {
    const service = new ContactService(prismaMock() as never);
    await expect(
      service.updateStatus(actor(['ACCOUNTANT']), 'submission-1', 'RESOLVED', undefined, CORRELATION_ID),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('masking helpers', () => {
  it('masks emails and phones, passing through nulls', () => {
    expect(maskEmail('guest@example.com')).toBe('gue***@example.com');
    expect(maskEmail('ab@example.com')).toBe('ab***@example.com');
    expect(maskEmail(null)).toBeNull();
    expect(maskPhone('+84901234567')).toBe('****4567');
    expect(maskPhone('123')).toBe('****');
    expect(maskPhone(null)).toBeNull();
  });
});
