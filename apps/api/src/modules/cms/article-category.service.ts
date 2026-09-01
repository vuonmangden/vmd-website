import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from '../auth/auth.types';
import type { CreateArticleCategoryDto, UpdateArticleCategoryDto } from './dto/article-category.dto';

@Injectable()
export class ArticleCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Admin ──────────────────────────────────────────────────

  listAll() {
    return this.prisma.articleCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  async findById(id: string) {
    const category = await this.prisma.articleCategory.findUnique({ where: { id } });
    if (!category) throw notFound();
    return category;
  }

  async create(actor: AuthenticatedActor, dto: CreateArticleCategoryDto, correlationId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const category = await tx.articleCategory.create({
          data: { name: dto.name.trim(), slug: dto.slug, description: dto.description?.trim() || null, sortOrder: dto.sortOrder ?? 0, status: 'ACTIVE' },
        });
        await tx.auditLog.create({ data: audit(actor, 'article_category.created', category.id, { slug: category.slug }, correlationId) });
        return category;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw slugTaken();
      throw error;
    }
  }

  async update(actor: AuthenticatedActor, id: string, dto: UpdateArticleCategoryDto, correlationId: string) {
    await this.findById(id);
    const data: Prisma.ArticleCategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description.trim() || null;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.articleCategory.update({ where: { id }, data });
      await tx.auditLog.create({ data: audit(actor, 'article_category.updated', id, { name: updated.name, status: updated.status }, correlationId) });
      return updated;
    });
  }

  // ── Public ─────────────────────────────────────────────────

  publicList() {
    return this.prisma.articleCategory.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true, description: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }
}

function audit(actor: AuthenticatedActor, action: string, resourceId: string, afterData: Record<string, unknown>, correlationId: string) {
  return {
    actorType: 'STAFF' as const,
    actorId: actor.staffProfileId,
    action,
    resourceType: 'article_category',
    resourceId,
    afterData: afterData as Prisma.InputJsonValue,
    correlationId,
  };
}

function notFound(): NotFoundException {
  return new NotFoundException({ code: 'ARTICLE_CATEGORY_NOT_FOUND', message: 'Article category not found' });
}

function slugTaken(): ConflictException {
  return new ConflictException({ code: 'ARTICLE_CATEGORY_SLUG_TAKEN', message: 'An article category with this slug already exists' });
}
