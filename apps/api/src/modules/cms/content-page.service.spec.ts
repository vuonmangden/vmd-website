import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ContentPageService } from './content-page.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const PAGE_ID = '00000000-0000-4000-8000-000000000010';
const ACTOR: AuthenticatedActor = {
  staffProfileId: '00000000-0000-4000-8000-000000000001',
  authUserId: '00000000-0000-4000-8000-000000000002',
  fullName: 'Marketing',
  email: 'marketing@example.com',
  roles: ['MARKETING'],
  permissions: ['content.manage'],
};

function fakePage(overrides?: Record<string, unknown>) {
  return { id: PAGE_ID, slug: 've-chung-toi', title: 'Về chúng tôi', body: 'Nội dung', status: 'DRAFT', publishedAt: null, updatedAt: new Date('2026-08-22T00:00:00.000Z'), ...overrides };
}

function prismaMock() {
  const contentPage = {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(fakePage()),
    create: jest.fn().mockResolvedValue(fakePage()),
    update: jest.fn().mockImplementation(({ data }) => ({ ...fakePage(), ...data })),
  };
  const auditLog = { create: jest.fn() };
  const tx = { contentPage, auditLog };
  return {
    contentPage,
    auditLog,
    $transaction: jest.fn((op: (t: typeof tx) => unknown) => op(tx)),
  };
}

describe('ContentPageService', () => {
  describe('create', () => {
    it('creates a page as DRAFT and writes an audit row', async () => {
      const prisma = prismaMock();
      const service = new ContentPageService(prisma as never);

      const result = await service.create(ACTOR, { slug: 've-chung-toi', title: 'Về chúng tôi', body: 'Nội dung' }, 'corr-1');

      expect(result.status).toBe('DRAFT');
      expect(prisma.contentPage.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ slug: 've-chung-toi', status: 'DRAFT', createdBy: ACTOR.staffProfileId }) }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'content_page.created', correlationId: 'corr-1' }) }));
    });

    it('maps a duplicate slug to ConflictException', async () => {
      const prisma = prismaMock();
      prisma.contentPage.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2002', clientVersion: '7.7.0' }));
      const service = new ContentPageService(prisma as never);

      await expect(service.create(ACTOR, { slug: 've-chung-toi', title: 'x', body: 'y' }, 'corr-1')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('updates only the provided fields', async () => {
      const prisma = prismaMock();
      const service = new ContentPageService(prisma as never);

      await service.update(ACTOR, PAGE_ID, { title: 'Tiêu đề mới' }, 'corr-1');

      expect(prisma.contentPage.update).toHaveBeenCalledWith({ where: { id: PAGE_ID }, data: { updatedBy: ACTOR.staffProfileId, title: 'Tiêu đề mới' } });
    });

    it('throws NotFoundException for a missing or archived page', async () => {
      const prisma = prismaMock();
      prisma.contentPage.findFirst.mockResolvedValue(null);
      const service = new ContentPageService(prisma as never);
      await expect(service.update(ACTOR, PAGE_ID, { title: 'x' }, 'corr-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('publish/unpublish/archive', () => {
    it('publishes a page, stamping publishedAt', async () => {
      const prisma = prismaMock();
      const service = new ContentPageService(prisma as never);

      const result = await service.publish(ACTOR, PAGE_ID, 'corr-1');

      expect(result.status).toBe('PUBLISHED');
      expect(prisma.contentPage.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PUBLISHED', publishedAt: expect.any(Date) }) }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'content_page.published' }) }));
    });

    it('returns a published page to DRAFT on unpublish', async () => {
      const prisma = prismaMock();
      const service = new ContentPageService(prisma as never);
      const result = await service.unpublish(ACTOR, PAGE_ID, 'corr-1');
      expect(result.status).toBe('DRAFT');
    });

    it('archives a page by setting deletedAt', async () => {
      const prisma = prismaMock();
      const service = new ContentPageService(prisma as never);

      await service.archive(ACTOR, PAGE_ID, 'corr-1');

      expect(prisma.contentPage.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'content_page.archived' }) }));
    });
  });

  describe('public', () => {
    it('publicList only queries PUBLISHED, non-deleted pages', async () => {
      const prisma = prismaMock();
      const service = new ContentPageService(prisma as never);

      await service.publicList();

      expect(prisma.contentPage.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PUBLISHED', deletedAt: null } }));
    });

    it('publicGet 404s for a draft page even if the slug exists', async () => {
      const prisma = prismaMock();
      prisma.contentPage.findFirst.mockResolvedValue(null); // the query itself filters status: PUBLISHED
      const service = new ContentPageService(prisma as never);

      await expect(service.publicGet('ve-chung-toi')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.contentPage.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'PUBLISHED' }) }));
    });

    it('publicGet returns the page body for a published slug', async () => {
      const prisma = prismaMock();
      prisma.contentPage.findFirst.mockResolvedValue({ slug: 've-chung-toi', title: 'Về chúng tôi', body: 'Nội dung', publishedAt: new Date() });
      const service = new ContentPageService(prisma as never);

      const result = await service.publicGet('ve-chung-toi');
      expect(result).toMatchObject({ slug: 've-chung-toi', body: 'Nội dung' });
    });
  });
});
