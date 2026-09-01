import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ArticleService } from './article.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const ARTICLE_ID = '00000000-0000-4000-8000-000000000020';
const ACTOR: AuthenticatedActor = {
  staffProfileId: '00000000-0000-4000-8000-000000000001',
  authUserId: '00000000-0000-4000-8000-000000000002',
  fullName: 'Marketing',
  email: 'marketing@example.com',
  roles: ['MARKETING'],
  permissions: ['content.manage'],
};

function fakeArticle(overrides?: Record<string, unknown>) {
  return {
    id: ARTICLE_ID,
    slug: 'khoi-dau-mua-he',
    title: 'Khởi đầu mùa hè',
    content: { blocks: [] },
    excerpt: null,
    categoryId: null,
    coverMediaId: null,
    status: 'DRAFT',
    publishedAt: null,
    updatedAt: new Date('2026-08-22T00:00:00.000Z'),
    ...overrides,
  };
}

function prismaMock() {
  const article = {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(fakeArticle()),
    create: jest.fn().mockResolvedValue(fakeArticle()),
    update: jest.fn().mockImplementation(({ data }) => ({ ...fakeArticle(), ...data })),
  };
  const auditLog = { create: jest.fn() };
  const tx = { article, auditLog };
  return {
    article,
    auditLog,
    $transaction: jest.fn((op: (t: typeof tx) => unknown) => op(tx)),
  };
}

describe('ArticleService', () => {
  describe('create', () => {
    it('creates an article as DRAFT, stamps the acting staff as author, and writes an audit row', async () => {
      const prisma = prismaMock();
      const service = new ArticleService(prisma as never);

      const result = await service.create(ACTOR, { slug: 'khoi-dau-mua-he', title: 'Khởi đầu mùa hè', content: { blocks: [] } }, 'corr-1');

      expect(result.status).toBe('DRAFT');
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'khoi-dau-mua-he', status: 'DRAFT', authorId: ACTOR.staffProfileId }) }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'article.created', correlationId: 'corr-1' }) }));
    });

    it('maps a duplicate slug to ConflictException', async () => {
      const prisma = prismaMock();
      prisma.article.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2002', clientVersion: '7.7.0' }));
      const service = new ArticleService(prisma as never);

      await expect(service.create(ACTOR, { slug: 'x', title: 'x', content: {} }, 'corr-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps an unknown categoryId to BadRequestException instead of a raw constraint error', async () => {
      const prisma = prismaMock();
      prisma.article.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('fk violation', { code: 'P2003', clientVersion: '7.7.0' }));
      const service = new ArticleService(prisma as never);

      await expect(
        service.create(ACTOR, { slug: 'x', title: 'x', content: {}, categoryId: '00000000-0000-4000-8000-000000000099' }, 'corr-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates only the provided fields', async () => {
      const prisma = prismaMock();
      const service = new ArticleService(prisma as never);

      await service.update(ACTOR, ARTICLE_ID, { title: 'Tiêu đề mới' }, 'corr-1');

      expect(prisma.article.update).toHaveBeenCalledWith({ where: { id: ARTICLE_ID }, data: { title: 'Tiêu đề mới' } });
    });

    it('disconnects the category when categoryId is explicitly cleared with null', async () => {
      const prisma = prismaMock();
      const service = new ArticleService(prisma as never);

      await service.update(ACTOR, ARTICLE_ID, { categoryId: null }, 'corr-1');

      expect(prisma.article.update).toHaveBeenCalledWith({ where: { id: ARTICLE_ID }, data: { category: { disconnect: true } } });
    });

    it('throws NotFoundException for a missing or archived article', async () => {
      const prisma = prismaMock();
      prisma.article.findFirst.mockResolvedValue(null);
      const service = new ArticleService(prisma as never);
      await expect(service.update(ACTOR, ARTICLE_ID, { title: 'x' }, 'corr-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('publish/unpublish/archive', () => {
    it('publishes an article, stamping publishedAt', async () => {
      const prisma = prismaMock();
      const service = new ArticleService(prisma as never);

      const result = await service.publish(ACTOR, ARTICLE_ID, 'corr-1');

      expect(result.status).toBe('PUBLISHED');
      expect(prisma.article.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PUBLISHED', publishedAt: expect.any(Date) }) }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'article.published' }) }));
    });

    it('returns a published article to DRAFT on unpublish', async () => {
      const prisma = prismaMock();
      const service = new ArticleService(prisma as never);
      const result = await service.unpublish(ACTOR, ARTICLE_ID, 'corr-1');
      expect(result.status).toBe('DRAFT');
    });

    it('archives an article by setting deletedAt', async () => {
      const prisma = prismaMock();
      const service = new ArticleService(prisma as never);

      await service.archive(ACTOR, ARTICLE_ID, 'corr-1');

      expect(prisma.article.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'article.archived' }) }));
    });
  });

  describe('public', () => {
    it('publicList only queries PUBLISHED, non-deleted articles', async () => {
      const prisma = prismaMock();
      const service = new ArticleService(prisma as never);

      await service.publicList();

      expect(prisma.article.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PUBLISHED', deletedAt: null } }));
    });

    it('publicGet 404s for a draft article even if the slug exists', async () => {
      const prisma = prismaMock();
      prisma.article.findFirst.mockResolvedValue(null); // the query itself filters status: PUBLISHED
      const service = new ArticleService(prisma as never);

      await expect(service.publicGet('khoi-dau-mua-he')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.article.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'PUBLISHED' }) }));
    });

    it('publicGet returns the article content for a published slug', async () => {
      const prisma = prismaMock();
      prisma.article.findFirst.mockResolvedValue({ slug: 'khoi-dau-mua-he', title: 'Khởi đầu mùa hè', content: { blocks: [] }, publishedAt: new Date() });
      const service = new ArticleService(prisma as never);

      const result = await service.publicGet('khoi-dau-mua-he');
      expect(result).toMatchObject({ slug: 'khoi-dau-mua-he', content: { blocks: [] } });
    });
  });
});
