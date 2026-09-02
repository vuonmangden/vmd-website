import { adminApi } from '../lib/api-client';

export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  status: string;
  category: { id: string; name: string } | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface ArticleDetail {
  id: string;
  categoryId: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: Record<string, unknown>;
  coverMediaId: string | null;
  authorId: string | null;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleInput {
  slug: string;
  title: string;
  content: Record<string, unknown>;
  excerpt?: string;
  categoryId?: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
}

export interface UpdateArticleInput {
  title?: string;
  content?: Record<string, unknown>;
  excerpt?: string;
  categoryId?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
}

export function listArticles(): Promise<ArticleSummary[]> {
  return adminApi<ArticleSummary[]>('/admin/articles');
}

export function getArticle(id: string): Promise<ArticleDetail> {
  return adminApi<ArticleDetail>(`/admin/articles/${encodeURIComponent(id)}`);
}

export function createArticle(input: CreateArticleInput): Promise<ArticleDetail> {
  return adminApi<ArticleDetail>('/admin/articles', { method: 'POST', body: JSON.stringify(input) });
}

export function updateArticle(id: string, input: UpdateArticleInput): Promise<ArticleDetail> {
  return adminApi<ArticleDetail>(`/admin/articles/${encodeURIComponent(id)}/update`, { method: 'POST', body: JSON.stringify(input) });
}

export function publishArticle(id: string): Promise<ArticleDetail> {
  return adminApi<ArticleDetail>(`/admin/articles/${encodeURIComponent(id)}/publish`, { method: 'POST', body: JSON.stringify({}) });
}

export function unpublishArticle(id: string): Promise<ArticleDetail> {
  return adminApi<ArticleDetail>(`/admin/articles/${encodeURIComponent(id)}/unpublish`, { method: 'POST', body: JSON.stringify({}) });
}

export function archiveArticle(id: string): Promise<{ id: string; status: string }> {
  return adminApi<{ id: string; status: string }>(`/admin/articles/${encodeURIComponent(id)}/archive`, { method: 'POST', body: JSON.stringify({}) });
}

/**
 * `articles.content` is a JSONB blob with no editor-chosen structure yet
 * (see CMS-004/CMS-007 notes) — the plain-text convention already used by
 * the public site is `{ text: "..." }`. Mirrored here rather than imported
 * so this admin form reads/writes the same shape the public pages render.
 */
export function extractArticleText(content: unknown): string {
  if (content && typeof content === 'object' && 'text' in content) {
    const value = (content as { text: unknown }).text;
    if (typeof value === 'string') return value;
  }
  return '';
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  status: string;
}

export interface CreateArticleCategoryInput {
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateArticleCategoryInput {
  name?: string;
  description?: string;
  sortOrder?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export function listArticleCategories(): Promise<ArticleCategory[]> {
  return adminApi<ArticleCategory[]>('/admin/article-categories');
}

export function createArticleCategory(input: CreateArticleCategoryInput): Promise<ArticleCategory> {
  return adminApi<ArticleCategory>('/admin/article-categories', { method: 'POST', body: JSON.stringify(input) });
}

export function updateArticleCategory(id: string, input: UpdateArticleCategoryInput): Promise<ArticleCategory> {
  return adminApi<ArticleCategory>(`/admin/article-categories/${encodeURIComponent(id)}/update`, { method: 'POST', body: JSON.stringify(input) });
}
