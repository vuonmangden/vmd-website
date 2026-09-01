import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from '../auth/auth.types';
import type { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';

const PUBLIC_LIST_SELECT = {
  slug: true,
  title: true,
  excerpt: true,
  coverMediaId: true,
  publishedAt: true,
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ArticleSelect;

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Admin ──────────────────────────────────────────────────

  listAll() {
    return this.prisma.article.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true, title: true, status: true, category: { select: { id: true, name: true } }, publishedAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string) {
    const article = await this.prisma.article.findFirst({ where: { id, deletedAt: null } });
    if (!article) throw notFound();
    return article;
  }

  async create(actor: AuthenticatedActor, dto: CreateArticleDto, correlationId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const article = await tx.article.create({
          data: {
            slug: dto.slug,
            title: dto.title.trim(),
            content: dto.content as Prisma.InputJsonValue,
            excerpt: dto.excerpt?.trim() || null,
            categoryId: dto.categoryId ?? null,
            coverMediaId: dto.coverMediaId ?? null,
            seoTitle: dto.seoTitle?.trim() || null,
            seoDescription: dto.seoDescription?.trim() || null,
            canonicalUrl: dto.canonicalUrl?.trim() || null,
            status: 'DRAFT',
            authorId: actor.staffProfileId,
          },
        });
        await tx.auditLog.create({ data: audit(actor, 'article.created', article.id, { slug: article.slug, status: article.status }, correlationId) });
        return article;
      });
    } catch (error) {
      throw normalizeWriteError(error);
    }
  }

  async update(actor: AuthenticatedActor, id: string, dto: UpdateArticleDto, correlationId: string) {
    const current = await this.findById(id);
    const data: Prisma.ArticleUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.content !== undefined) data.content = dto.content as Prisma.InputJsonValue;
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt.trim() || null;
    if (dto.categoryId !== undefined) data.category = dto.categoryId ? { connect: { id: dto.categoryId } } : { disconnect: true };
    if (dto.coverMediaId !== undefined) data.coverMediaId = dto.coverMediaId || null;
    if (dto.seoTitle !== undefined) data.seoTitle = dto.seoTitle.trim() || null;
    if (dto.seoDescription !== undefined) data.seoDescription = dto.seoDescription.trim() || null;
    if (dto.canonicalUrl !== undefined) data.canonicalUrl = dto.canonicalUrl.trim() || null;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.article.update({ where: { id }, data });
        await tx.auditLog.create({ data: audit(actor, 'article.updated', id, { title: updated.title !== current.title, status: updated.status }, correlationId) });
        return updated;
      });
    } catch (error) {
      throw normalizeWriteError(error);
    }
  }

  async publish(actor: AuthenticatedActor, id: string, correlationId: string) {
    await this.findById(id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.article.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
      await tx.auditLog.create({ data: audit(actor, 'article.published', id, { slug: updated.slug }, correlationId) });
      return updated;
    });
  }

  async unpublish(actor: AuthenticatedActor, id: string, correlationId: string) {
    await this.findById(id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.article.update({ where: { id }, data: { status: 'DRAFT' } });
      await tx.auditLog.create({ data: audit(actor, 'article.unpublished', id, { slug: updated.slug }, correlationId) });
      return updated;
    });
  }

  async archive(actor: AuthenticatedActor, id: string, correlationId: string) {
    await this.findById(id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.article.update({ where: { id }, data: { deletedAt: new Date(), status: 'DRAFT' } });
      await tx.auditLog.create({ data: audit(actor, 'article.archived', id, { slug: updated.slug }, correlationId) });
      return { id: updated.id, status: updated.status };
    });
  }

  // ── Public ─────────────────────────────────────────────────

  publicList() {
    return this.prisma.article.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: PUBLIC_LIST_SELECT,
      orderBy: { publishedAt: 'desc' },
    });
  }

  async publicGet(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      select: {
        slug: true,
        title: true,
        content: true,
        excerpt: true,
        coverMediaId: true,
        seoTitle: true,
        seoDescription: true,
        canonicalUrl: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
      },
    });
    if (!article) throw notFound();
    return article;
  }
}

/**
 * `categoryId` is a real foreign key (unlike the plain-UUID actor fields
 * elsewhere in this module) since categories are a first-class content
 * relationship, not an audit trail — an unknown id must surface as a client
 * error, not a raw constraint violation.
 */
function normalizeWriteError(error: unknown): Error {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return slugTaken();
    if (error.code === 'P2003' || error.code === 'P2025') return categoryNotFound();
  }
  return error instanceof Error ? error : new Error(String(error));
}

function audit(actor: AuthenticatedActor, action: string, resourceId: string, afterData: Record<string, unknown>, correlationId: string) {
  return {
    actorType: 'STAFF' as const,
    actorId: actor.staffProfileId,
    action,
    resourceType: 'article',
    resourceId,
    afterData: afterData as Prisma.InputJsonValue,
    correlationId,
  };
}

function notFound(): NotFoundException {
  return new NotFoundException({ code: 'ARTICLE_NOT_FOUND', message: 'Article not found' });
}

function slugTaken(): ConflictException {
  return new ConflictException({ code: 'ARTICLE_SLUG_TAKEN', message: 'An article with this slug already exists' });
}

function categoryNotFound(): BadRequestException {
  return new BadRequestException({ code: 'ARTICLE_CATEGORY_NOT_FOUND', message: 'The referenced article category does not exist' });
}
