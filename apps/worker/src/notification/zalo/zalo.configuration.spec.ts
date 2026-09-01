import { ZaloDeliveryError } from './zalo.types';
import { loadZaloConfiguration } from './zalo.configuration';

const approvedStagingConfiguration: NodeJS.ProcessEnv = {
  APP_ENV: 'staging',
  ZALO_ENABLED: 'true',
  ZALO_PROVIDER: 'mock',
  ZALO_API_BASE_URL: 'http://127.0.0.1:4011',
};

describe('loadZaloConfiguration', () => {
  it('loads the staging mock path', () => {
    const configuration = loadZaloConfiguration(approvedStagingConfiguration);

    expect(configuration.provider).toBe('mock');
    expect(configuration.enabled).toBe(true);
    expect(configuration.isProduction).toBe(false);
    expect(configuration.apiBaseUrl).toBe('http://127.0.0.1:4011');
  });

  it('defaults to disabled when ZALO_ENABLED is not set', () => {
    const configuration = loadZaloConfiguration({
      ...approvedStagingConfiguration,
      ZALO_ENABLED: undefined,
    });

    expect(configuration.enabled).toBe(false);
  });

  it('fails closed in production even if enabled and configured', () => {
    expect(() =>
      loadZaloConfiguration({
        ...approvedStagingConfiguration,
        APP_ENV: 'production',
      }),
    ).toThrow(ZaloDeliveryError);
  });

  it('rejects an unsupported synthetic provider', () => {
    expect(() =>
      loadZaloConfiguration({
        ...approvedStagingConfiguration,
        ZALO_PROVIDER: 'znsdirect',
      }),
    ).toThrow(ZaloDeliveryError);
  });

  it('rejects a malformed api base url', () => {
    expect(() =>
      loadZaloConfiguration({
        ...approvedStagingConfiguration,
        ZALO_API_BASE_URL: 'not-a-url',
      }),
    ).toThrow(ZaloDeliveryError);
  });
});
