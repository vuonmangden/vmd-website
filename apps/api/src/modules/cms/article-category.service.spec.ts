import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ArticleCategoryService } from './article-category.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const CATEGORY_ID = '00000000-0000-4000-8000-000000000030';
const ACTOR: AuthenticatedActor = {
  staffProfileId: '00000000-0000-4000-8000-000000000001',
  authUserId: '00000000-0000-4000-8000-000000000002',
  fullName: 'Marketing',
  email: 'marketing@example.com',
  roles: ['MARKETING'],
  permissions: ['content.manage'],
};

function fakeCategory(overrides?: Record<string, unknown>) {
  return { id: CATEGORY_ID, name: 'Ẩm thực', slug: 'am-thuc', description: null, sortOrder: 0, status: 'ACTIVE', ...overrides };
}

function prismaMock() {
  const articleCategory = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(fakeCategory()),
    create: jest.fn().mockResolvedValue(fakeCategory()),
    update: jest.fn().mockImplementation(({ data }) => ({ ...fakeCategory(), ...data })),
  };
  const auditLog = { create: jest.fn() };
  const tx = { articleCategory, auditLog };
  return {
    articleCategory,
    auditLog,
    $transaction: jest.fn((op: (t: typeof tx) => unknown) => op(tx)),
  };
}

describe('ArticleCategoryService', () => {
  describe('create', () => {
    it('creates a category as ACTIVE and writes an audit row', async () => {
      const prisma = prismaMock();
      const service = new ArticleCategoryService(prisma as never);

      const result = await service.create(ACTOR, { name: 'Ẩm thực', slug: 'am-thuc' }, 'corr-1');

      expect(result.status).toBe('ACTIVE');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'article_category.created', correlationId: 'corr-1' }) }));
    });

    it('maps a duplicate slug to ConflictException', async () => {
      const prisma = prismaMock();
      prisma.articleCategory.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2002', clientVersion: '7.7.0' }));
      const service = new ArticleCategoryService(prisma as never);

      await expect(service.create(ACTOR, { name: 'x', slug: 'am-thuc' }, 'corr-1')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('updates only the provided fields, including toggling status', async () => {
      const prisma = prismaMock();
      const service = new ArticleCategoryService(prisma as never);

      await service.update(ACTOR, CATEGORY_ID, { status: 'INACTIVE' }, 'corr-1');

      expect(prisma.articleCategory.update).toHaveBeenCalledWith({ where: { id: CATEGORY_ID }, data: { status: 'INACTIVE' } });
    });

    it('throws NotFoundException for an unknown category', async () => {
      const prisma = prismaMock();
      prisma.articleCategory.findUnique.mockResolvedValue(null);
      const service = new ArticleCategoryService(prisma as never);

      await expect(service.update(ACTOR, CATEGORY_ID, { name: 'x' }, 'corr-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('publicList', () => {
    it('only queries ACTIVE categories', async () => {
      const prisma = prismaMock();
      const service = new ArticleCategoryService(prisma as never);

      await service.publicList();

      expect(prisma.articleCategory.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'ACTIVE' } }));
    });
  });
});
