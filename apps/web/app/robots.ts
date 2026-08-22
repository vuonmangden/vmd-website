import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_WEB_ORIGIN ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Transactional/checkout pages carry no independent SEO value and are
      // also marked `robots: { index: false }` on the page itself — this is
      // belt-and-suspenders for crawlers that don't honour the meta tag.
      disallow: ['/dat-phong', '/dat-bbq', '/thanh-toan'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
