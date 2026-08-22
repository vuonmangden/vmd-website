import { describe, expect, it } from 'vitest';
import robots from './robots';

describe('robots', () => {
  it('disallows every checkout/transactional page and points at the sitemap', () => {
    const result = robots();

    expect(result.rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: ['/dat-phong', '/dat-bbq', '/thanh-toan'],
    });
    expect(result.sitemap).toBe('http://localhost:3000/sitemap.xml');
  });
});
