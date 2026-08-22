import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from '../auth/auth.types';
import type { CreateContentPageDto, UpdateContentPageDto } from './dto/content-page.dto';

@Injectable()
export class ContentPageService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Admin ──────────────────────────────────────────────────

  listAll() {
    return this.prisma.contentPage.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true, title: true, status: true, publishedAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string) {
    const page = await this.prisma.contentPage.findFirst({ where: { id, deletedAt: null } });
    if (!page) throw notFound();
    return page;
  }

  async create(actor: AuthenticatedActor, dto: CreateContentPageDto, correlationId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const page = await tx.contentPage.create({
          data: { slug: dto.slug, title: dto.title.trim(), body: dto.body, status: 'DRAFT', createdBy: actor.staffProfileId, updatedBy: actor.staffProfileId },
        });
        await tx.auditLog.create({ data: audit(actor, 'content_page.created', page.id, { slug: page.slug, status: page.status }, correlationId) });
        return page;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw slugTaken();
      throw error;
    }
  }

  async update(actor: AuthenticatedActor, id: string, dto: UpdateContentPageDto, correlationId: string) {
    const current = await this.findById(id);
    const data: Prisma.ContentPageUpdateInput = { updatedBy: actor.staffProfileId };
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.body !== undefined) data.body = dto.body;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contentPage.update({ where: { id }, data });
      await tx.auditLog.create({ data: audit(actor, 'content_page.updated', id, { title: updated.title !== current.title, body: updated.body !== current.body }, correlationId) });
      return updated;
    });
  }

  async publish(actor: AuthenticatedActor, id: string, correlationId: string) {
    await this.findById(id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contentPage.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date(), updatedBy: actor.staffProfileId } });
      await tx.auditLog.create({ data: audit(actor, 'content_page.published', id, { slug: updated.slug }, correlationId) });
      return updated;
    });
  }

  async unpublish(actor: AuthenticatedActor, id: string, correlationId: string) {
    await this.findById(id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contentPage.update({ where: { id }, data: { status: 'DRAFT', updatedBy: actor.staffProfileId } });
      await tx.auditLog.create({ data: audit(actor, 'content_page.unpublished', id, { slug: updated.slug }, correlationId) });
      return updated;
    });
  }

  async archive(actor: AuthenticatedActor, id: string, correlationId: string) {
    await this.findById(id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contentPage.update({ where: { id }, data: { deletedAt: new Date(), status: 'DRAFT', updatedBy: actor.staffProfileId } });
      await tx.auditLog.create({ data: audit(actor, 'content_page.archived', id, { slug: updated.slug }, correlationId) });
      return { id: updated.id, status: updated.status };
    });
  }

  // ── Public ─────────────────────────────────────────────────

  publicList() {
    return this.prisma.contentPage.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: { slug: true, title: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async publicGet(slug: string) {
    const page = await this.prisma.contentPage.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      select: { slug: true, title: true, body: true, publishedAt: true },
    });
    if (!page) throw notFound();
    return page;
  }
}

function audit(actor: AuthenticatedActor, action: string, resourceId: string, afterData: Record<string, unknown>, correlationId: string) {
  return {
    actorType: 'STAFF' as const,
    actorId: actor.staffProfileId,
    action,
    resourceType: 'content_page',
    resourceId,
    afterData: afterData as Prisma.InputJsonValue,
    correlationId,
  };
}

function notFound(): NotFoundException {
  return new NotFoundException({ code: 'CONTENT_PAGE_NOT_FOUND', message: 'Content page not found' });
}

function slugTaken(): ConflictException {
  return new ConflictException({ code: 'CONTENT_PAGE_SLUG_TAKEN', message: 'A content page with this slug already exists' });
}
