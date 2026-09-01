export interface PublicArticleSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  category: { name: string; slug: string } | null;
}

export interface PublicArticleDetail extends PublicArticleSummary {
  content: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
}

const apiBase = `${process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:3002'}/api/v1`;

export async function listArticles(): Promise<PublicArticleSummary[]> {
  const response = await fetch(`${apiBase}/public/articles`, { next: { revalidate: 300 } });
  if (!response.ok) throw new Error('PUBLIC_ARTICLES_LIST_FAILED');
  const envelope = (await response.json()) as { data: PublicArticleSummary[] };
  return envelope.data;
}

/** Returns null on a genuine 404 (unknown or unpublished slug) so callers can render a real not-found state instead of a generic error. */
export async function getArticleBySlug(slug: string): Promise<PublicArticleDetail | null> {
  const response = await fetch(`${apiBase}/public/articles/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('PUBLIC_ARTICLE_DETAIL_FAILED');
  const envelope = (await response.json()) as { data: PublicArticleDetail };
  return envelope.data;
}

/**
 * `content` is an unstructured JSONB column — CMS-004 shipped it without a
 * fixed block-editor format because none was chosen yet. Until one is,
 * `{ text: "..." }` (blank-line-separated paragraphs) is the only shape
 * rendered here. Plain text only, never HTML: React escapes it automatically
 * when rendered as children, so there is no stored-XSS surface from content
 * typed into the admin CRUD.
 */
export function paragraphsFromContent(content: unknown): string[] {
  const text =
    typeof content === 'object' && content !== null && typeof (content as { text?: unknown }).text === 'string'
      ? (content as { text: string }).text
      : '';
  return paragraphsFromText(text);
}

export function paragraphsFromText(text: string): string[] {
  return text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export function formatArticleDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}
