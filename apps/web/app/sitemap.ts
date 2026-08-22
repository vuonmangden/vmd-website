import type { MetadataRoute } from 'next';
import { publicApi } from './phong/room-api';

const baseUrl = process.env.NEXT_PUBLIC_WEB_ORIGIN ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/phong`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/bbq`, changeFrequency: 'weekly', priority: 0.8 },
    ...(await roomRoutes()),
  ];
}

/**
 * Content pages (CMS-002) and articles (CMS-004) have no public route to
 * render them yet, so they aren't in this sitemap — adding a URL for a page
 * that doesn't exist would be worse than omitting it. This only enumerates
 * routes that are actually served today.
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
