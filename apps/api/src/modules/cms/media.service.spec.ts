import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { AuthenticatedActor } from '../auth/auth.types';

const sendMock = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input, __type: 'PutObjectCommand' })),
  HeadObjectCommand: jest.fn().mockImplementation((input) => ({ input, __type: 'HeadObjectCommand' })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input, __type: 'DeleteObjectCommand' })),
}));
const getSignedUrlMock = jest.fn().mockResolvedValue('https://minio.local/vmd-local/media/abc.jpg?signature=x');
jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: (...args: unknown[]) => getSignedUrlMock(...args) }));

import { MediaService } from './media.service';

const MEDIA_ID = '00000000-0000-4000-8000-000000000010';
const ACTOR: AuthenticatedActor = {
  staffProfileId: '00000000-0000-4000-8000-000000000001',
  authUserId: '00000000-0000-4000-8000-000000000002',
  fullName: 'Marketing',
  email: 'marketing@example.com',
  roles: ['MARKETING'],
  permissions: ['content.manage'],
};

const VALID_CONFIG = { endpoint: 'http://127.0.0.1:9000', bucket: 'vmd-local', accessKeyId: 'vmd_local_minio', secretAccessKey: 'secret', forcePathStyle: true, region: 'us-east-1' };

function fakeMedia(overrides?: Record<string, unknown>) {
  return { id: MEDIA_ID, bucket: 'vmd-local', objectKey: 'media/abc.jpg', originalName: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 1000n, altText: null, visibility: 'PUBLIC', status: 'PENDING', createdAt: new Date('2026-08-22T00:00:00.000Z'), ...overrides };
}

function prismaMock() {
  const mediaAsset = {
    create: jest.fn().mockResolvedValue(fakeMedia()),
    findFirst: jest.fn().mockResolvedValue(fakeMedia()),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockImplementation(({ data }) => ({ ...fakeMedia(), ...data })),
    delete: jest.fn(),
  };
  const auditLog = { create: jest.fn() };
  const tx = { mediaAsset, auditLog };
  return { mediaAsset, auditLog, $transaction: jest.fn((op: (t: typeof tx) => unknown) => op(tx)) };
}

function storageConfigMock(config: typeof VALID_CONFIG | null = VALID_CONFIG) {
  return { get: jest.fn().mockImplementation(() => { if (!config) throw new ServiceUnavailableException({ code: 'MEDIA_STORAGE_UNAVAILABLE' }); return config; }) };
}

beforeEach(() => {
  sendMock.mockReset();
  getSignedUrlMock.mockClear();
});

describe('MediaService.requestUpload', () => {
  it('creates a PENDING row with a server-derived object key and returns a signed PUT URL', async () => {
    const prisma = prismaMock();
    const service = new MediaService(prisma as never, storageConfigMock() as never);

    const result = await service.requestUpload(ACTOR, { filename: 'evil.php.jpg', contentType: 'image/jpeg', sizeBytes: 2048 }, 'corr-1');

    expect(prisma.mediaAsset.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', mimeType: 'image/jpeg', originalName: 'evil.php.jpg', uploadedBy: ACTOR.staffProfileId }) }));
    const objectKey = prisma.mediaAsset.create.mock.calls[0][0].data.objectKey as string;
    expect(objectKey).toMatch(/^media\/[0-9a-f-]+\.jpg$/); // extension is derived from contentType, not the (untrusted) filename
    expect(result).toEqual(expect.objectContaining({ mediaId: MEDIA_ID, uploadUrl: expect.stringContaining('signature'), objectKey }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'media.upload_requested' }) }));
  });

  it('fails closed when storage is not configured', async () => {
    const prisma = prismaMock();
    const service = new MediaService(prisma as never, storageConfigMock(null) as never);
    await expect(service.requestUpload(ACTOR, { filename: 'x.jpg', contentType: 'image/jpeg', sizeBytes: 100 }, 'corr-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('MediaService.completeUpload', () => {
  it('confirms the asset using the real size/type reported by storage, not the declared values', async () => {
    const prisma = prismaMock();
    sendMock.mockResolvedValue({ ContentLength: 2048, ContentType: 'image/jpeg' });
    const service = new MediaService(prisma as never, storageConfigMock() as never);

    const result = await service.completeUpload(ACTOR, MEDIA_ID, 'corr-1');

    expect(prisma.mediaAsset.update).toHaveBeenCalledWith({ where: { id: MEDIA_ID }, data: { status: 'CONFIRMED', sizeBytes: 2048, mimeType: 'image/jpeg' } });
    expect(result.status).toBe('CONFIRMED');
    expect(result.url).toContain('vmd-local/media/abc.jpg');
  });

  it('rejects and deletes the object when the real content-type does not match what was declared', async () => {
    const prisma = prismaMock();
    sendMock.mockResolvedValue({ ContentLength: 2048, ContentType: 'application/x-php' });
    const service = new MediaService(prisma as never, storageConfigMock() as never);

    await expect(service.completeUpload(ACTOR, MEDIA_ID, 'corr-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ __type: 'DeleteObjectCommand' }));
    expect(prisma.mediaAsset.delete).toHaveBeenCalledWith({ where: { id: MEDIA_ID } });
    expect(prisma.mediaAsset.update).not.toHaveBeenCalled();
  });

  it('rejects an oversized upload even if the client declared a smaller size', async () => {
    const prisma = prismaMock();
    sendMock.mockResolvedValue({ ContentLength: 20 * 1024 * 1024, ContentType: 'image/jpeg' });
    const service = new MediaService(prisma as never, storageConfigMock() as never);

    await expect(service.completeUpload(ACTOR, MEDIA_ID, 'corr-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when the object was never actually uploaded', async () => {
    const prisma = prismaMock();
    sendMock.mockRejectedValue(new Error('NotFound'));
    const service = new MediaService(prisma as never, storageConfigMock() as never);

    await expect(service.completeUpload(ACTOR, MEDIA_ID, 'corr-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException for an unknown or already-confirmed media id', async () => {
    const prisma = prismaMock();
    prisma.mediaAsset.findFirst.mockResolvedValue(null);
    const service = new MediaService(prisma as never, storageConfigMock() as never);
    await expect(service.completeUpload(ACTOR, MEDIA_ID, 'corr-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('MediaService.archive', () => {
  it('soft-deletes without touching storage', async () => {
    const prisma = prismaMock();
    const service = new MediaService(prisma as never, storageConfigMock() as never);

    await service.archive(ACTOR, MEDIA_ID, 'corr-1');

    expect(prisma.mediaAsset.update).toHaveBeenCalledWith({ where: { id: MEDIA_ID }, data: { deletedAt: expect.any(Date) } });
    expect(sendMock).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'media.archived' }) }));
  });

  it('throws NotFoundException for an unknown media id', async () => {
    const prisma = prismaMock();
    prisma.mediaAsset.findFirst.mockResolvedValue(null);
    const service = new MediaService(prisma as never, storageConfigMock() as never);
    await expect(service.archive(ACTOR, MEDIA_ID, 'corr-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
