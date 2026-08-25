import type { MetadataRoute } from 'next';
import { publicApi } from './phong/room-api';
import { listArticles } from './tin-tuc/article-api';

const baseUrl = process.env.NEXT_PUBLIC_WEB_ORIGIN ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/phong`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/bbq`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/tin-tuc`, changeFrequency: 'weekly', priority: 0.6 },
    ...(await roomRoutes()),
    ...(await articleRoutes()),
  ];
}

/**
 * content_pages (CMS-002) still has no public route to render it — its
 * slugs are meant for one-off links (footer, policy pages) rather than a
 * crawlable listing, and there is no admin-facing "publish this in the
 * sitemap" flag to decide which ones should be discoverable. Only articles
 * (CMS-004), which do have a public /tin-tuc listing, are enumerated here.
 */
async function roomRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const { items } = await publicApi<{ items: Array<{ slug: string }> }>('/public/rooms');
    return items.map((room) => ({
      url: `${baseUrl}/phong/${room.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {
    // A sitemap missing room pages beats a failed build when the API is
    // unreachable at generation time.
    return [];
  }
}

async function articleRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const articles = await listArticles();
    return articles.map((article) => ({
      url: `${baseUrl}/tin-tuc/${article.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));
  } catch {
    return [];
  }
}
