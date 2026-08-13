import { SecurityConfigService } from './security.config';

describe('SecurityConfigService', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('uses the approved local and staging CORS allow-list outside production', () => {
    process.env = { ...original, APP_ENV: 'staging', CORS_ALLOWED_ORIGINS: '' };
    expect(new SecurityConfigService().get().corsOrigins).toEqual(expect.objectContaining({ size: 4 }));
  });

  it('fails closed in production without exact HTTPS CORS origins', () => {
    process.env = { ...original, APP_ENV: 'production', CORS_ALLOWED_ORIGINS: '' };
    expect(() => new SecurityConfigService().get()).toThrow('Security configuration is currently unavailable');

    process.env.CORS_ALLOWED_ORIGINS = '*';
    expect(() => new SecurityConfigService().get()).toThrow('Security configuration is currently unavailable');
  });

  it('accepts the production allow-list and explicit trusted proxy address', () => {
    process.env = {
      ...original,
      APP_ENV: 'production',
      CORS_ALLOWED_ORIGINS: 'https://vuonmangden.vn,https://www.vuonmangden.vn,https://admin.vuonmangden.vn',
      TRUSTED_PROXY_IPS: '10.0.0.10',
    };
    const config = new SecurityConfigService().get();
    expect(config.corsOrigins.has('https://admin.vuonmangden.vn')).toBe(true);
    expect(config.trustedProxyIps.has('10.0.0.10')).toBe(true);
  });
});
