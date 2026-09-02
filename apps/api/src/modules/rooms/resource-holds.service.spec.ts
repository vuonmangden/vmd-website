import { ResourceHoldsService } from './resource-holds.service';

describe('ResourceHoldsService', () => {
  const now = new Date('2099-01-01T00:00:00.000Z');
  const input = { resourceType: 'ROOM', resourceId: '00000000-0000-4000-8000-000000000004', referenceType: 'SANDBOX_BOOKING', referenceId: '00000000-0000-4000-8000-000000000009', startAt: new Date('2099-02-01T00:00:00.000Z'), endAt: new Date('2099-02-02T00:00:00.000Z'), idempotencyKey: 'sandbox-key' };
  it('is idempotent and uses configured server-side expiry', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'hold' }); const findUnique = jest.fn().mockResolvedValue(null);
    const service = new ResourceHoldsService({ resourceHold: { findUnique, create } } as never, () => now, 15);
    await service.create(input);
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'ACTIVE', expiresAt: new Date('2099-01-01T00:15:00.000Z') }) });
    findUnique.mockResolvedValue({ id: 'hold' }); await expect(service.create(input)).resolves.toEqual({ id: 'hold' }); expect(create).toHaveBeenCalledTimes(1);
  });
  it('expires active due holds only', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 2 }); const service = new ResourceHoldsService({ resourceHold: { updateMany } } as never, () => now, 15);
    await service.expireDue(); expect(updateMany).toHaveBeenCalledWith({ where: { status: 'ACTIVE', expiresAt: { lte: now } }, data: { status: 'EXPIRED', releasedAt: now } });
  });

  it('rejects a hold whose end is not after its start', async () => {
    const create = jest.fn(); const service = new ResourceHoldsService({ resourceHold: { findUnique: jest.fn(), create } } as never, () => now, 15);
    await expect(service.create({ ...input, endAt: input.startAt })).rejects.toMatchObject({ response: { code: 'INVALID_RESOURCE_HOLD' } });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a blank idempotency key', async () => {
    const create = jest.fn(); const service = new ResourceHoldsService({ resourceHold: { findUnique: jest.fn(), create } } as never, () => now, 15);
    await expect(service.create({ ...input, idempotencyKey: '   ' })).rejects.toMatchObject({ response: { code: 'INVALID_RESOURCE_HOLD' } });
    expect(create).not.toHaveBeenCalled();
  });
});
