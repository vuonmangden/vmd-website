import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface StorageConfig {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** MinIO (and most S3-compatible local/self-hosted stores) require path-style URLs; real AWS S3 does not. */
  forcePathStyle: boolean;
  region: string;
}

/**
 * Object storage is still a PRE-007 open item — the owner has not chosen or
 * provisioned production storage (docs/09_MILESTONE_0_INPUT_PACK.md §10, "Ngân
 * hàng/object storage/public domain vẫn Chờ dữ liệu"). Production is hard-disabled
 * here the same way IAM-001/NTF-002/SePay stayed disabled until their PRE-007
 * items closed — only the local MinIO sandbox is reachable for now.
 */
@Injectable()
export class StorageConfigService {
  get(): StorageConfig {
    const environment = process.env['APP_ENV'] ?? process.env['NODE_ENV'] ?? 'development';
    const endpoint = process.env['MINIO_ENDPOINT']?.trim();
    const bucket = process.env['MINIO_BUCKET']?.trim();
    const accessKeyId = process.env['MINIO_ROOT_USER']?.trim();
    const secretAccessKey = process.env['MINIO_ROOT_PASSWORD']?.trim();

    if (environment === 'production' || !endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException({ code: 'MEDIA_STORAGE_UNAVAILABLE', message: 'Media storage is currently unavailable' });
    }

    return { endpoint, bucket, accessKeyId, secretAccessKey, forcePathStyle: true, region: 'us-east-1' };
  }
}
