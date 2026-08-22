import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from '../auth/auth.types';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { StorageConfigService } from './storage.config';
import type { ALLOWED_MEDIA_MIME_TYPES, RequestMediaUploadDto } from './dto/media.dto';

const UPLOAD_URL_EXPIRY_SECONDS = 300;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const EXTENSION_BY_MIME_TYPE: Record<(typeof ALLOWED_MEDIA_MIME_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageConfig: StorageConfigService,
  ) {}

  /**
   * The stored object key always uses a server-derived extension from the
   * validated Content-Type, never the client-supplied filename — so a
   * mismatched or malicious extension in `filename` never reaches storage.
   * `originalName` is kept only for display.
   */
  async requestUpload(actor: AuthenticatedActor, dto: RequestMediaUploadDto, correlationId: string) {
    const config = this.storageConfig.get();
    const client = this.client(config);
    const extension = EXTENSION_BY_MIME_TYPE[dto.contentType];
    const objectKey = `media/${randomUUID()}.${extension}`;

    return this.prisma.$transaction(async (tx) => {
      const media = await tx.mediaAsset.create({
        data: {
          bucket: config.bucket,
          objectKey,
          originalName: dto.filename,
          mimeType: dto.contentType,
          sizeBytes: dto.sizeBytes,
          altText: dto.altText?.trim() || null,
          status: 'PENDING',
          uploadedBy: actor.staffProfileId,
        },
      });

      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket: config.bucket, Key: objectKey, ContentType: dto.contentType, ContentLength: dto.sizeBytes }),
        { expiresIn: UPLOAD_URL_EXPIRY_SECONDS },
      );

      await tx.auditLog.create({ data: audit(actor, 'media.upload_requested', media.id, { objectKey, contentType: dto.contentType, sizeBytes: dto.sizeBytes }, correlationId) });

      return { mediaId: media.id, uploadUrl, objectKey, expiresAt: new Date(Date.now() + UPLOAD_URL_EXPIRY_SECONDS * 1000).toISOString() };
    });
  }

  /**
   * S3 is the source of truth for what was actually uploaded — the declared
   * size/type from requestUpload() are only a first-line check. A mismatch
   * here (wrong size, wrong type) deletes the object and the pending row
   * rather than trusting the client's original claim.
   */
  async completeUpload(actor: AuthenticatedActor, mediaId: string, correlationId: string) {
    const media = await this.prisma.mediaAsset.findFirst({ where: { id: mediaId, status: 'PENDING', deletedAt: null } });
    if (!media) throw notFound();

    const config = this.storageConfig.get();
    const client = this.client(config);

    let head;
    try {
      head = await client.send(new HeadObjectCommand({ Bucket: media.bucket, Key: media.objectKey }));
    } catch {
      throw new BadRequestException({ code: 'MEDIA_UPLOAD_NOT_FOUND', message: 'The file was not found in storage — upload it before completing' });
    }

    const actualSize = head.ContentLength ?? 0;
    const actualType = head.ContentType ?? '';
    if (actualSize <= 0 || actualSize > MAX_UPLOAD_BYTES || actualType !== media.mimeType) {
      await this.deleteObject(client, media.bucket, media.objectKey);
      await this.prisma.mediaAsset.delete({ where: { id: media.id } });
      throw new BadRequestException({ code: 'MEDIA_UPLOAD_INVALID', message: 'Uploaded file does not match the declared type or size limit' });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.mediaAsset.update({ where: { id: media.id }, data: { status: 'CONFIRMED', sizeBytes: actualSize, mimeType: actualType } });
      await tx.auditLog.create({ data: audit(actor, 'media.upload_completed', media.id, { objectKey: media.objectKey, sizeBytes: actualSize }, correlationId) });
      return this.toView(updated, config);
    });
  }

  async list() {
    const config = this.storageConfig.get();
    const rows = await this.prisma.mediaAsset.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
    return rows.map((row) => this.toView(row, config));
  }

  /** Soft-delete only — the underlying object is left in storage rather than hard-deleted, matching how every other admin "archive" action in this project works. */
  async archive(actor: AuthenticatedActor, id: string, correlationId: string) {
    const media = await this.prisma.mediaAsset.findFirst({ where: { id, deletedAt: null } });
    if (!media) throw notFound();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.mediaAsset.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.auditLog.create({ data: audit(actor, 'media.archived', id, { objectKey: media.objectKey }, correlationId) });
      return { id: updated.id };
    });
  }

  private toView(media: { id: string; bucket: string; objectKey: string; originalName: string; mimeType: string; sizeBytes: bigint | null; altText: string | null; visibility: string; status: string; createdAt: Date }, config: { endpoint: string }) {
    return {
      id: media.id,
      objectKey: media.objectKey,
      originalName: media.originalName,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes?.toString() ?? null,
      altText: media.altText,
      visibility: media.visibility,
      status: media.status,
      url: `${config.endpoint}/${media.bucket}/${media.objectKey}`,
      createdAt: media.createdAt,
    };
  }

  private async deleteObject(client: S3Client, bucket: string, key: string): Promise<void> {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      // Object may never have been fully uploaded; nothing to clean up.
    }
  }

  private client(config: { endpoint: string; region: string; forcePathStyle: boolean; accessKeyId: string; secretAccessKey: string }): S3Client {
    return new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }
}

function audit(actor: AuthenticatedActor, action: string, resourceId: string, afterData: Record<string, unknown>, correlationId: string) {
  return { actorType: 'STAFF' as const, actorId: actor.staffProfileId, action, resourceType: 'media_asset', resourceId, afterData: afterData as Prisma.InputJsonValue, correlationId };
}

function notFound(): NotFoundException {
  return new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media asset not found' });
}
