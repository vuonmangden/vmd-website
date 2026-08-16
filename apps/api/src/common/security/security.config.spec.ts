import {
  HELMET_OPTIONS,
  parseCorsOrigins,
  buildCorsOptions,
  BODY_SIZE_LIMIT,
} from './security.config';

describe('parseCorsOrigins', () => {
  it('returns an empty list when unset', () => {
    expect(parseCorsOrigins(undefined)).toEqual([]);
    expect(parseCorsOrigins('')).toEqual([]);
  });

  it('splits a comma-separated allowlist', () => {
    expect(parseCorsOrigins('https://a.vn,https://b.vn')).toEqual([
      'https://a.vn',
      'https://b.vn',
    ]);
  });

  it('trims whitespace and drops empty entries', () => {
    expect(parseCorsOrigins(' https://a.vn , , https://b.vn ')).toEqual([
      'https://a.vn',
      'https://b.vn',
    ]);
  });
});

describe('buildCorsOptions', () => {
  it('denies all origins when the allowlist is empty', () => {
    expect(buildCorsOptions(undefined).origin).toBe(false);
  });

  it('never allows a wildcard origin', () => {
    const options = buildCorsOptions('https://admin.vuonmangden.vn');
    expect(options.origin).toEqual(['https://admin.vuonmangden.vn']);
    expect(options.origin).not.toBe('*');
  });

  it('enables credentials with an explicit allowlist', () => {
    const options = buildCorsOptions('https://admin.vuonmangden.vn');
    expect(options.credentials).toBe(true);
  });

  it('allows the correlation and idempotency headers', () => {
    const options = buildCorsOptions('https://admin.vuonmangden.vn');
    expect(options.allowedHeaders).toContain('X-Correlation-Id');
    expect(options.allowedHeaders).toContain('Idempotency-Key');
  });
});

describe('HELMET_OPTIONS', () => {
  it('denies framing and object embedding', () => {
    const directives = HELMET_OPTIONS.contentSecurityPolicy as {
      directives: Record<string, string[]>;
    };
    expect(directives.directives['frameAncestors']).toEqual(["'none'"]);
    expect(directives.directives['objectSrc']).toEqual(["'none'"]);
  });

  it('enables HSTS for one year including subdomains', () => {
    expect(HELMET_OPTIONS.hsts).toEqual({
      maxAge: 31_536_000,
      includeSubDomains: true,
      preload: true,
    });
  });

  it('enables nosniff and frame deny', () => {
    expect(HELMET_OPTIONS.noSniff).toBe(true);
    expect(HELMET_OPTIONS.frameguard).toEqual({ action: 'deny' });
  });
});

describe('BODY_SIZE_LIMIT', () => {
  it('caps request bodies', () => {
    expect(BODY_SIZE_LIMIT).toBe('1mb');
  });
});
