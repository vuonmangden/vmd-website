import { ServiceUnavailableException } from '@nestjs/common';
import { StorageConfigService } from './storage.config';

const SANDBOX_ENV = {
  MINIO_ENDPOINT: 'http://127.0.0.1:9000',
  MINIO_BUCKET: 'vmd-local',
  MINIO_ROOT_USER: 'vmd_local_minio',
  MINIO_ROOT_PASSWORD: 'vmd_local_minio_only_password',
};

const PRODUCTION_ENV = {
  APP_ENV: 'production',
  STORAGE_ENV: 'production',
  STORAGE_ENDPOINT: 'https://abcdefgh.supabase.co/storage/v1/s3',
  STORAGE_BUCKET: 'vmd-media',
  STORAGE_ACCESS_KEY_ID: 'access-key-id',
  STORAGE_SECRET_ACCESS_KEY: 'secret-access-key',
  STORAGE_REGION: 'ap-southeast-1',
};

const TOUCHED = [
  'APP_ENV', 'NODE_ENV', 'STORAGE_ENV', 'STORAGE_ENDPOINT', 'STORAGE_BUCKET',
  'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_REGION',
  'STORAGE_FORCE_PATH_STYLE', 'MINIO_ENDPOINT', 'MINIO_BUCKET', 'MINIO_ROOT_USER',
  'MINIO_ROOT_PASSWORD', 'MINIO_REGION',
];

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(TOUCHED.map((key) => [key, process.env[key]]));
  for (const key of TOUCHED) delete process.env[key];
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function withEnv(values: Record<string, string>) {
  Object.assign(process.env, values);
  return new StorageConfigService();
}

describe('StorageConfigService sandbox', () => {
  it('reads the local MinIO contract when no storage environment is declared', () => {
    const config = withEnv(SANDBOX_ENV).get();

    expect(config).toEqual(expect.objectContaining({
      endpoint: 'http://127.0.0.1:9000', bucket: 'vmd-local', forcePathStyle: true, region: 'us-east-1', mode: 'sandbox',
    }));
  });

  it('fails closed when the local contract is incomplete', () => {
    const service = withEnv({ MINIO_ENDPOINT: 'http://127.0.0.1:9000' });
    expect(() => service.get()).toThrow(ServiceUnavailableException);
  });
});

describe('StorageConfigService production', () => {
  it('returns the production contract when explicitly opted in', () => {
    const config = withEnv(PRODUCTION_ENV).get();

    expect(config).toEqual({
      endpoint: 'https://abcdefgh.supabase.co/storage/v1/s3',
      bucket: 'vmd-media',
      accessKeyId: 'access-key-id',
      secretAccessKey: 'secret-access-key',
      region: 'ap-southeast-1',
      forcePathStyle: true,
      mode: 'production',
    });
  });

  /**
   * The whole point of the opt-in: deploying with APP_ENV=production but no
   * storage contract must refuse to serve rather than silently fall back to
   * the local MinIO credentials, which in production resolve to nothing.
   */
  it('refuses production when STORAGE_ENV does not also opt in', () => {
    const service = withEnv({ ...SANDBOX_ENV, APP_ENV: 'production' });
    expect(() => service.get()).toThrow(ServiceUnavailableException);
  });

  it.each([
    ['STORAGE_ENDPOINT', 'http://insecure.example.com'],
    ['STORAGE_REGION', 'Not A Region'],
    ['STORAGE_BUCKET', 'INVALID_UPPERCASE'],
  ])('rejects a malformed %s rather than signing requests with it', (key, value) => {
    const service = withEnv({ ...PRODUCTION_ENV, [key]: value });
    expect(() => service.get()).toThrow(ServiceUnavailableException);
  });

  it('requires every production secret to be present', () => {
    for (const key of ['STORAGE_ENDPOINT', 'STORAGE_BUCKET', 'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_REGION']) {
      const environment = { ...PRODUCTION_ENV };
      delete (environment as Record<string, string>)[key];
      const service = withEnv(environment);
      expect(() => service.get()).toThrow(ServiceUnavailableException);
      for (const touched of TOUCHED) delete process.env[touched];
    }
  });

  /**
   * Region is not cosmetic: the AWS SDK signs every request with it, so a
   * wrong value fails signature verification instead of erroring clearly.
   * The previous hardcoded 'us-east-1' could not have worked against either
   * Supabase (ap-southeast-1) or R2 (auto).
   */
  it('carries the provider region through instead of assuming us-east-1', () => {
    expect(withEnv({ ...PRODUCTION_ENV, STORAGE_REGION: 'auto' }).get().region).toBe('auto');
  });

  it('allows virtual-host style for real AWS S3', () => {
    expect(withEnv({ ...PRODUCTION_ENV, STORAGE_FORCE_PATH_STYLE: 'false' }).get().forcePathStyle).toBe(false);
  });
});
