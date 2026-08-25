export interface PublicContentPage {
  slug: string;
  title: string;
  body: string;
  publishedAt: string;
}

const apiBase = `${process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:3002'}/api/v1`;

/** Returns null on a genuine 404 (unknown or unpublished slug) so callers can render a real not-found state instead of a generic error. */
export async function getContentPageBySlug(slug: string): Promise<PublicContentPage | null> {
  const response = await fetch(`${apiBase}/public/content-pages/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('PUBLIC_CONTENT_PAGE_FAILED');
  const envelope = (await response.json()) as { data: PublicContentPage };
  return envelope.data;
}

/** `body` is plain text (VarChar/Text column, no rich editor yet) — split into blank-line-separated paragraphs, same convention as tin-tuc/article-api.ts. */
export function paragraphsFromText(text: string): string[] {
  return text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

/** A short, safe meta description when the page has no dedicated SEO fields (content_pages has none, unlike articles) — plain-text truncation only, no HTML stripping needed since body is already plain text. */
export function truncateForDescription(text: string, maxLength = 155): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}
