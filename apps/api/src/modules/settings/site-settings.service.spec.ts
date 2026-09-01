import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const CORRELATION_ID = '00000000-0000-4000-8000-000000000009';

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
      key: 'site.name',
      value: 'Vườn Măng Đen',
      updatedAt: new Date('2026-08-16T00:00:00Z'),
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

describe('SiteSettingsService.list', () => {
  it('allows Super Admin, Manager and Reception to read', async () => {
    for (const role of ['SUPER_ADMIN', 'MANAGER', 'RECEPTION']) {
      const prisma = prismaMock();
      const service = new SiteSettingsService(prisma as never);
      await expect(service.list(actor([role]))).resolves.toEqual([]);
    }
  });

  it('denies Accountant', async () => {
    const service = new SiteSettingsService(prismaMock() as never);
    await expect(service.list(actor(['ACCOUNTANT']))).rejects.toThrow(ForbiddenException);
  });

  it('reads only allow-listed keys', async () => {
    const prisma = prismaMock();
    const service = new SiteSettingsService(prisma as never);
    await service.list(actor(['MANAGER']));

    const where = prisma.appSetting.findMany.mock.calls[0][0].where;
    expect(where.key.in).toContain('site.name');
    expect(where.key.in).not.toContain('booking.hold_ttl_minutes');
  });
});

describe('SiteSettingsService.update', () => {
  it('writes the setting and its audit record in one transaction', async () => {
    const prisma = prismaMock();
    const service = new SiteSettingsService(prisma as never);

    await service.update(actor(['MANAGER']), { key: 'site.name', value: 'Vườn Măng Đen' }, CORRELATION_ID);

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

  it('records the previous value as beforeData', async () => {
    const prisma = prismaMock();
    prisma.appSetting.findUnique.mockResolvedValue({ value: 'Old name' });
    const service = new SiteSettingsService(prisma as never);

    await service.update(actor(['MANAGER']), { key: 'site.name', value: 'New name' }, CORRELATION_ID);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        beforeData: { key: 'site.name', value: 'Old name' },
        afterData: { key: 'site.name', value: 'New name' },
      }),
    });
  });

  it('rejects a key outside the allow-list', async () => {
    const service = new SiteSettingsService(prismaMock() as never);
    await expect(
      service.update(actor(['SUPER_ADMIN']), { key: 'booking.hold_ttl_minutes', value: '30' }, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires the content.manage permission', async () => {
    const service = new SiteSettingsService(prismaMock() as never);
    await expect(
      service.update(actor(['MANAGER'], ['report.read']), { key: 'site.name', value: 'X' }, CORRELATION_ID),
    ).rejects.toThrow(ForbiddenException);
  });

  it('denies Reception from writing', async () => {
    const service = new SiteSettingsService(prismaMock() as never);
    await expect(
      service.update(actor(['RECEPTION']), { key: 'site.name', value: 'X' }, CORRELATION_ID),
    ).rejects.toThrow(ForbiddenException);
  });

  it('restricts timezone and currency to Super Admin', async () => {
    const service = new SiteSettingsService(prismaMock() as never);

    for (const key of ['app.timezone', 'app.currency']) {
      await expect(
        service.update(actor(['MANAGER']), { key, value: 'Asia/Bangkok' }, CORRELATION_ID),
      ).rejects.toThrow(ForbiddenException);
    }

    await expect(
      service.update(actor(['SUPER_ADMIN']), { key: 'app.timezone', value: 'Asia/Ho_Chi_Minh' }, CORRELATION_ID),
    ).resolves.toBeDefined();
  });

  it('requires a boolean for banner.enabled', async () => {
    const service = new SiteSettingsService(prismaMock() as never);

    await expect(
      service.update(actor(['MANAGER']), { key: 'banner.enabled', value: 'true' }, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.update(actor(['MANAGER']), { key: 'banner.enabled', value: true }, CORRELATION_ID),
    ).resolves.toBeDefined();
  });

  it('rejects a non-string value for text settings', async () => {
    const service = new SiteSettingsService(prismaMock() as never);
    await expect(
      service.update(actor(['MANAGER']), { key: 'site.name', value: 42 }, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('trims whitespace and rejects an oversized value', async () => {
    const prisma = prismaMock();
    const service = new SiteSettingsService(prisma as never);

    await service.update(actor(['MANAGER']), { key: 'site.name', value: '  Vườn Măng Đen  ' }, CORRELATION_ID);
    expect(prisma.appSetting.upsert.mock.calls[0][0].update.value).toBe('Vườn Măng Đen');

    await expect(
      service.update(actor(['MANAGER']), { key: 'site.name', value: 'x'.repeat(5_001) }, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('stamps the acting staff as updatedBy rather than trusting input', async () => {
    const prisma = prismaMock();
    const service = new SiteSettingsService(prisma as never);

    await service.update(actor(['MANAGER']), { key: 'site.name', value: 'X' }, CORRELATION_ID);

    expect(prisma.appSetting.upsert.mock.calls[0][0].update.updatedBy).toBe(
      '00000000-0000-4000-8000-000000000001',
    );
  });
});
