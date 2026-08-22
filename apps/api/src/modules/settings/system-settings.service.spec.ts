import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const CORRELATION_ID = '00000000-0000-4000-8000-000000000009';
const UPDATED_AT = new Date('2026-08-16T00:00:00Z');

function actor(roles: string[], permissions: string[] = ['content.manage']): AuthenticatedActor {
  return {
    staffProfileId: '00000000-0000-4000-8000-000000000001',
    authUserId: '00000000-0000-4000-8000-000000000002',
    fullName: 'Test Staff',
    email: 'staff@example.com',
    roles,
    permissions,
  };
}

function prismaMock() {
  const appSetting = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({
      key: 'app.name',
      value: 'Vườn Măng Đen',
      category: 'general',
      isSecretReference: false,
      updatedAt: UPDATED_AT,
    }),
  };
  const auditLog = { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const tx = { appSetting, auditLog };
  return {
    appSetting,
    auditLog,
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
}

describe('SystemSettingsService.list', () => {
  it('allows Super Admin and Manager to read', async () => {
    for (const role of ['SUPER_ADMIN', 'MANAGER']) {
      const prisma = prismaMock();
      const service = new SystemSettingsService(prisma as never);
      await expect(service.list(actor([role]))).resolves.toEqual([]);
    }
  });

  it('denies Reception and Accountant', async () => {
    for (const role of ['RECEPTION', 'ACCOUNTANT']) {
      const service = new SystemSettingsService(prismaMock() as never);
      await expect(service.list(actor([role]))).rejects.toThrow(ForbiddenException);
    }
  });

  it('reads only the technical settings key set, never a CMS-001 site-settings key', async () => {
    const prisma = prismaMock();
    const service = new SystemSettingsService(prisma as never);
    await service.list(actor(['MANAGER']));

    const where = prisma.appSetting.findMany.mock.calls[0][0].where;
    expect(where.key.in).toContain('payment.expiry_hours.room');
    expect(where.key.in).not.toContain('site.name');
  });

  it('masks the value of a secret-reference row instead of reading it back to the UI', async () => {
    const prisma = prismaMock();
    prisma.appSetting.findMany.mockResolvedValue([
      { key: 'some.secret', value: 'env:SOME_SECRET', category: 'general', isSecretReference: true, updatedAt: UPDATED_AT },
    ]);
    const service = new SystemSettingsService(prisma as never);

    const rows = await service.list(actor(['SUPER_ADMIN']));

    expect(rows).toEqual([
      { key: 'some.secret', category: 'general', value: null, isSecretReference: true, updatedAt: UPDATED_AT },
    ]);
  });
});

describe('SystemSettingsService.update', () => {
  it('writes the setting and its audit record in one transaction', async () => {
    const prisma = prismaMock();
    const service = new SystemSettingsService(prisma as never);

    await service.update(actor(['MANAGER']), { key: 'app.name', value: 'Vườn Măng Đen' }, CORRELATION_ID);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.appSetting.upsert).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'setting.updated',
        resourceType: 'app_settings',
        correlationId: CORRELATION_ID,
      }),
    });
  });

  it('rejects a key outside the allow-list, including a CMS-001 site-settings key', async () => {
    const service = new SystemSettingsService(prismaMock() as never);
    await expect(
      service.update(actor(['SUPER_ADMIN']), { key: 'site.name', value: 'X' }, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires the content.manage permission', async () => {
    const service = new SystemSettingsService(prismaMock() as never);
    await expect(
      service.update(actor(['MANAGER'], ['report.read']), { key: 'app.name', value: 'X' }, CORRELATION_ID),
    ).rejects.toThrow(ForbiddenException);
  });

  it('denies Reception from writing', async () => {
    const service = new SystemSettingsService(prismaMock() as never);
    await expect(
      service.update(actor(['RECEPTION']), { key: 'app.name', value: 'X' }, CORRELATION_ID),
    ).rejects.toThrow(ForbiddenException);
  });

  it('normalizes payment.expiry_hours.* into {hours} and rejects a value outside 1-168', async () => {
    const prisma = prismaMock();
    const service = new SystemSettingsService(prisma as never);

    await service.update(actor(['MANAGER']), { key: 'payment.expiry_hours.room', value: 48 }, CORRELATION_ID);
    expect(prisma.appSetting.upsert.mock.calls[0][0].update.value).toEqual({ hours: 48 });

    await expect(
      service.update(actor(['MANAGER']), { key: 'payment.expiry_hours.bbq', value: 200 }, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update(actor(['MANAGER']), { key: 'payment.expiry_hours.bbq', value: 0 }, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts the {hours} object shape directly, matching what the seed script already writes', async () => {
    const prisma = prismaMock();
    const service = new SystemSettingsService(prisma as never);

    await service.update(actor(['MANAGER']), { key: 'payment.expiry_hours.room', value: { hours: 24 } }, CORRELATION_ID);
    expect(prisma.appSetting.upsert.mock.calls[0][0].update.value).toEqual({ hours: 24 });
  });

  it('normalizes bbq.deposit_amount_per_table into {amount} and rejects a non-positive or absurd value', async () => {
    const prisma = prismaMock();
    const service = new SystemSettingsService(prisma as never);

    await service.update(actor(['MANAGER']), { key: 'bbq.deposit_amount_per_table', value: 150_000 }, CORRELATION_ID);
    expect(prisma.appSetting.upsert.mock.calls[0][0].update.value).toEqual({ amount: 150_000 });

    await expect(
      service.update(actor(['MANAGER']), { key: 'bbq.deposit_amount_per_table', value: 0 }, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update(actor(['MANAGER']), { key: 'bbq.deposit_amount_per_table', value: 100_000_000 }, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an app.name value outside 1-150 characters', async () => {
    const service = new SystemSettingsService(prismaMock() as never);
    await expect(
      service.update(actor(['MANAGER']), { key: 'app.name', value: '' }, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update(actor(['MANAGER']), { key: 'app.name', value: 'x'.repeat(151) }, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('stamps the acting staff as updatedBy rather than trusting input', async () => {
    const prisma = prismaMock();
    const service = new SystemSettingsService(prisma as never);

    await service.update(actor(['MANAGER']), { key: 'app.name', value: 'X' }, CORRELATION_ID);

    expect(prisma.appSetting.upsert.mock.calls[0][0].update.updatedBy).toBe(
      '00000000-0000-4000-8000-000000000001',
    );
  });

  it('proceeds when expectedUpdatedAt matches the current row', async () => {
    const prisma = prismaMock();
    prisma.appSetting.findUnique.mockResolvedValue({ value: 'Old', isSecretReference: false, updatedAt: UPDATED_AT });
    const service = new SystemSettingsService(prisma as never);

    await expect(
      service.update(
        actor(['MANAGER']),
        { key: 'app.name', value: 'New', expectedUpdatedAt: UPDATED_AT.toISOString() },
        CORRELATION_ID,
      ),
    ).resolves.toBeDefined();
  });

  it('rejects with RESOURCE_VERSION_CONFLICT when expectedUpdatedAt is stale', async () => {
    const prisma = prismaMock();
    prisma.appSetting.findUnique.mockResolvedValue({ value: 'Old', isSecretReference: false, updatedAt: UPDATED_AT });
    const service = new SystemSettingsService(prisma as never);

    await expect(
      service.update(
        actor(['MANAGER']),
        { key: 'app.name', value: 'New', expectedUpdatedAt: '2020-01-01T00:00:00.000Z' },
        CORRELATION_ID,
      ),
    ).rejects.toThrow(ConflictException);
    expect(prisma.appSetting.upsert).not.toHaveBeenCalled();
  });

  it('skips the concurrency check when expectedUpdatedAt is omitted', async () => {
    const prisma = prismaMock();
    prisma.appSetting.findUnique.mockResolvedValue({ value: 'Old', isSecretReference: false, updatedAt: UPDATED_AT });
    const service = new SystemSettingsService(prisma as never);

    await expect(
      service.update(actor(['MANAGER']), { key: 'app.name', value: 'New' }, CORRELATION_ID),
    ).resolves.toBeDefined();
  });

  it('records "[secret]" rather than the real reference as beforeData when overwriting a secret-reference row', async () => {
    const prisma = prismaMock();
    prisma.appSetting.findUnique.mockResolvedValue({ value: 'env:OLD_SECRET', isSecretReference: true, updatedAt: UPDATED_AT });
    const service = new SystemSettingsService(prisma as never);

    await service.update(actor(['MANAGER']), { key: 'app.name', value: 'New' }, CORRELATION_ID);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ beforeData: { key: 'app.name', value: '[secret]' } }),
    });
  });
});
