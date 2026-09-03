import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface StorageConfig {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /**
   * MinIO, Supabase Storage and Cloudflare R2 all accept path-style URLs;
   * real AWS S3 requires virtual-host style. Configurable rather than
   * hardcoded so a provider swap stays a configuration change.
   */
  forcePathStyle: boolean;
  region: string;
  mode: 'production' | 'sandbox';
}

/**
 * Production storage stays fail-closed until it is explicitly opted into,
 * matching the SePay/auth/email contract: `APP_ENV=production` alone is not
 * enough — `STORAGE_ENV=production` plus a complete, validated secret set is
 * required, so a half-configured deploy refuses to serve rather than writing
 * customer media somewhere unintended.
 *
 * Any S3-compatible provider works. Two that need no new vendor relationship
 * or cost at this project's scale:
 *   - Supabase Storage (the project already provisions Supabase):
 *     STORAGE_ENDPOINT=https://<project-ref>.supabase.co/storage/v1/s3
 *     STORAGE_REGION=<the project's region, e.g. ap-southeast-1>
 *   - Cloudflare R2:
 *     STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
 *     STORAGE_REGION=auto
 *
 * `region` must match the provider: the AWS SDK signs every request with it,
 * and a wrong value fails signature verification rather than erroring clearly,
 * which is why the old hardcoded 'us-east-1' could not have worked for either.
 */
@Injectable()
export class StorageConfigService {
  get(): StorageConfig {
    return this.mode() === 'production' ? productionConfig() : sandboxConfig();
  }

  private mode(): 'production' | 'sandbox' {
    const appEnvironment = process.env['APP_ENV'] ?? process.env['NODE_ENV'] ?? 'development';
    const configured = process.env['STORAGE_ENV']?.trim().toLowerCase();
    if (appEnvironment === 'production') {
      if (configured !== 'production') unavailable();
      return 'production';
    }
    if (!configured || configured === 'sandbox' || configured === 'test') return 'sandbox';
    if (configured === 'production') return 'production';
    unavailable();
  }
}

function productionConfig(): StorageConfig {
  return {
    endpoint: required('STORAGE_ENDPOINT', /^https:\/\/[^\s]+$/),
    bucket: required('STORAGE_BUCKET', /^[a-z0-9][a-z0-9.-]{1,62}$/),
    accessKeyId: required('STORAGE_ACCESS_KEY_ID'),
    secretAccessKey: required('STORAGE_SECRET_ACCESS_KEY'),
    region: required('STORAGE_REGION', /^[a-z0-9-]{2,32}$/),
    // Defaults to path-style (Supabase, R2, MinIO); set false for real AWS S3.
    forcePathStyle: process.env['STORAGE_FORCE_PATH_STYLE']?.trim().toLowerCase() !== 'false',
    mode: 'production',
  };
}

/** Local MinIO sandbox, unchanged — plain HTTP and fixed credentials are fine here and nowhere else. */
function sandboxConfig(): StorageConfig {
  const endpoint = process.env['MINIO_ENDPOINT']?.trim();
  const bucket = process.env['MINIO_BUCKET']?.trim();
  const accessKeyId = process.env['MINIO_ROOT_USER']?.trim();
  const secretAccessKey = process.env['MINIO_ROOT_PASSWORD']?.trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) unavailable();

  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: true,
    region: process.env['MINIO_REGION']?.trim() || 'us-east-1',
    mode: 'sandbox',
  };
}

function required(name: string, pattern?: RegExp): string {
  const value = process.env[name]?.trim();
  if (!value || value.length > 512 || (pattern && !pattern.test(value))) unavailable();
  return value;
}

function unavailable(): never {
  throw new ServiceUnavailableException({ code: 'MEDIA_STORAGE_UNAVAILABLE', message: 'Media storage is currently unavailable' });
}
