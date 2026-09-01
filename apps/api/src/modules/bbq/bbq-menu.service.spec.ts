import { ConflictException, NotFoundException } from '@nestjs/common';
import { BbqMenuService } from './bbq-menu.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const CORRELATION_ID = '00000000-0000-4000-8000-000000000010';

const ACTOR: AuthenticatedActor = {
  staffProfileId: '00000000-0000-4000-8000-000000000001',
  authUserId: '00000000-0000-4000-8000-000000000002',
  fullName: 'Manager',
  email: 'manager@example.com',
  roles: ['MANAGER'],
  permissions: ['bbq.manage'],
};

const INTERNAL_NOTE = 'giá bò bắp tại măng đen rẻ hơn bò mông';

function prismaMock() {
  const bbqMenuItem = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({
      id: 'item-1',
      code: 'GOI_BO_CA_PHAO',
      name: 'Gỏi bò cà pháo bắp bò',
      price: 119_000n,
      isAvailable: true,
    }),
  };
  const bbqCombo = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({
      id: 'combo-1',
      code: 'SET_TU_KHOAI',
      name: 'Set nướng Tứ Khoái',
      price: 369_000n,
      isAvailable: true,
    }),
  };
  const auditLog = { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const tx = { bbqMenuItem, bbqCombo, auditLog };
  return {
    bbqMenuItem,
    bbqCombo,
    auditLog,
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : [[], []],
    ),
  };
}

describe('BbqMenuService.publicMenu', () => {
  it('never selects the internal note', async () => {
    const prisma = prismaMock();
    const service = new BbqMenuService(prisma as never);

    await service.publicMenu();

    const itemSelect = prisma.bbqMenuItem.findMany.mock.calls[0][0].select;
    const comboSelect = prisma.bbqCombo.findMany.mock.calls[0][0].select;
    expect(itemSelect).not.toHaveProperty('internalNote');
    expect(comboSelect).not.toHaveProperty('internalNote');
  });

  it('shows only available entries', async () => {
    const prisma = prismaMock();
    const service = new BbqMenuService(prisma as never);

    await service.publicMenu();

    expect(prisma.bbqMenuItem.findMany.mock.calls[0][0].where).toEqual({ isAvailable: true });
    expect(prisma.bbqCombo.findMany.mock.calls[0][0].where).toEqual({ isAvailable: true });
  });

  it('serialises money as an integer string', async () => {
    const prisma = prismaMock();
    prisma.$transaction = jest.fn().mockResolvedValue([
      [{ code: 'GOI', name: 'Gỏi', menuGroup: 'GOI_SALAD_KHAI_VI', unit: 'đĩa', price: 155_000n, publicDescription: null }],
      [{ code: 'SET', name: 'Set', price: 369_000n, minGuests: 2, maxGuests: 3, composition: null }],
    ]);
    const service = new BbqMenuService(prisma as never);

    const result = await service.publicMenu();

    expect(result.items[0]?.price).toBe('155000');
    expect(result.combos[0]?.price).toBe('369000');
  });

  it('does not leak an internal note even if the row carries one', async () => {
    const prisma = prismaMock();
    prisma.$transaction = jest.fn().mockResolvedValue([
      [{ code: 'GOI', name: 'Gỏi', menuGroup: 'GOI_SALAD_KHAI_VI', unit: 'đĩa', price: 155_000n, publicDescription: 'Tươi ngon' }],
      [],
    ]);
    const service = new BbqMenuService(prisma as never);

    const result = await service.publicMenu();

    expect(JSON.stringify(result)).not.toContain(INTERNAL_NOTE);
    expect(JSON.stringify(result)).not.toContain('internalNote');
  });
});

describe('BbqMenuService.adminMenu', () => {
  it('returns unavailable entries too', async () => {
    const prisma = prismaMock();
    const service = new BbqMenuService(prisma as never);

    await service.adminMenu();

    expect(prisma.bbqMenuItem.findMany.mock.calls[0][0].where).toBeUndefined();
    expect(prisma.bbqCombo.findMany.mock.calls[0][0].where).toBeUndefined();
  });
});

describe('BbqMenuService.upsertMenuItem', () => {
  it('audits a creation with the new price', async () => {
    const prisma = prismaMock();
    const service = new BbqMenuService(prisma as never);

    await service.upsertMenuItem(
      ACTOR,
      {
        code: 'GOI_BO_CA_PHAO',
        name: 'Gỏi bò cà pháo bắp bò',
        menuGroup: 'GOI_SALAD_KHAI_VI',
        unit: 'Đĩa',
        price: 119_000n,
        internalNote: INTERNAL_NOTE,
      },
      CORRELATION_ID,
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'bbq.menu_item.created',
        resourceType: 'bbq_menu_item',
        afterData: expect.objectContaining({ price: '119000' }),
        correlationId: CORRELATION_ID,
      }),
    });
  });

  it('records the previous price when updating', async () => {
    const prisma = prismaMock();
    prisma.bbqMenuItem.findUnique.mockResolvedValue({
      price: 97_000n,
      name: 'Gỏi cũ',
      isAvailable: true,
    });
    const service = new BbqMenuService(prisma as never);

    await service.upsertMenuItem(
      ACTOR,
      { code: 'GOI_BO_CA_PHAO', name: 'Gỏi mới', menuGroup: 'GOI_SALAD_KHAI_VI', unit: 'Đĩa', price: 119_000n },
      CORRELATION_ID,
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'bbq.menu_item.updated',
        beforeData: expect.objectContaining({ price: '97000' }),
        afterData: expect.objectContaining({ price: '119000' }),
      }),
    });
  });

  it('writes the item and its audit in one transaction', async () => {
    const prisma = prismaMock();
    const service = new BbqMenuService(prisma as never);

    await service.upsertMenuItem(
      ACTOR,
      { code: 'X', name: 'X', menuGroup: 'MON_NUONG', unit: 'phần', price: 1n },
      CORRELATION_ID,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('stores a zero price for a free item such as a sauce', async () => {
    const prisma = prismaMock();
    const service = new BbqMenuService(prisma as never);

    await service.upsertMenuItem(
      ACTOR,
      { code: 'SOT_MUOI_DO', name: 'Sốt muối đỏ', menuGroup: 'SOT_CHAM', unit: 'phần', price: 0n },
      CORRELATION_ID,
    );

    expect(prisma.bbqMenuItem.upsert.mock.calls[0][0].create.price).toBe(0n);
  });
});

describe('BbqMenuService.upsertCombo', () => {
  it('rejects a guest range where the minimum exceeds the maximum', async () => {
    const service = new BbqMenuService(prismaMock() as never);

    await expect(
      service.upsertCombo(
        ACTOR,
        { code: 'SET_X', name: 'Set X', price: 1n, minGuests: 5, maxGuests: 2 },
        CORRELATION_ID,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('accepts a set with only a minimum guest count', async () => {
    const service = new BbqMenuService(prismaMock() as never);

    await expect(
      service.upsertCombo(
        ACTOR,
        { code: 'SET_CA_TAM', name: 'Set cá tầm Măng Đen', price: 999_000n, minGuests: 3 },
        CORRELATION_ID,
      ),
    ).resolves.toBeDefined();
  });

  it('audits the combo price', async () => {
    const prisma = prismaMock();
    const service = new BbqMenuService(prisma as never);

    await service.upsertCombo(
      ACTOR,
      { code: 'SET_TU_KHOAI', name: 'Set nướng Tứ Khoái', price: 369_000n, minGuests: 2, maxGuests: 3 },
      CORRELATION_ID,
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'bbq.combo.created',
        resourceType: 'bbq_combo',
        afterData: expect.objectContaining({ price: '369000' }),
      }),
    });
  });
});

describe('BbqMenuService.snapshotPrices', () => {
  it('returns the current price of each requested code', async () => {
    const prisma = prismaMock();
    prisma.bbqMenuItem.findMany.mockResolvedValue([{ code: 'GOI', name: 'Gỏi', unit: 'đĩa', price: 155_000n }]);
    prisma.bbqCombo.findMany.mockResolvedValue([{ code: 'SET_TU_KHOAI', name: 'Set Tứ Khoái', price: 369_000n }]);
    const service = new BbqMenuService(prisma as never);

    const result = await service.snapshotPrices({
      itemCodes: ['GOI'],
      comboCodes: ['SET_TU_KHOAI'],
    });

    expect(result.items[0]?.price).toBe('155000');
    expect(result.combos[0]?.price).toBe('369000');
    expect(result.snapshotAt).toBeInstanceOf(Date);
  });

  it('fails loudly when a code is unknown rather than dropping the line', async () => {
    const prisma = prismaMock();
    const service = new BbqMenuService(prisma as never);

    await expect(
      service.snapshotPrices({ itemCodes: ['MISSING'], comboCodes: [] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('fails when a requested entry is no longer available', async () => {
    const prisma = prismaMock();
    const service = new BbqMenuService(prisma as never);

    await expect(
      service.snapshotPrices({ itemCodes: [], comboCodes: ['SET_RETIRED'] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('only snapshots available entries', async () => {
    const prisma = prismaMock();
    prisma.bbqMenuItem.findMany.mockResolvedValue([{ code: 'GOI', name: 'Gỏi', unit: 'đĩa', price: 155_000n }]);
    const service = new BbqMenuService(prisma as never);

    await service.snapshotPrices({ itemCodes: ['GOI'], comboCodes: [] });

    expect(prisma.bbqMenuItem.findMany.mock.calls[0][0].where.isAvailable).toBe(true);
  });

  it('accepts an explicit transaction client, reading from it instead of this.prisma', async () => {
    const prisma = prismaMock();
    const tx = {
      bbqMenuItem: { findMany: jest.fn().mockResolvedValue([{ code: 'GOI', name: 'Gỏi', unit: 'đĩa', price: 155_000n }]) },
      bbqCombo: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new BbqMenuService(prisma as never);

    const result = await service.snapshotPrices({ itemCodes: ['GOI'], comboCodes: [] }, tx as never);

    expect(result.items[0]?.price).toBe('155000');
    expect(tx.bbqMenuItem.findMany).toHaveBeenCalled();
    expect(prisma.bbqMenuItem.findMany).not.toHaveBeenCalled();
  });
});
