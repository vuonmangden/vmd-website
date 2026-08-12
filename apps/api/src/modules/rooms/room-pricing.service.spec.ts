import { RoomPricingService } from './room-pricing.service';

describe('RoomPricingService', () => {
  it('loads only active rules for the requested non-archived room type', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const quote = jest.fn().mockReturnValue({ total: 0n });
    const service = new RoomPricingService({ roomRateRule: { findMany } } as never, { quote } as never);
    await expect(service.quote('room-type-id', '2099-01-01', '2099-01-02', 1, 0)).resolves.toEqual({ total: 0n });
    expect(findMany).toHaveBeenCalledWith({ where: { roomTypeId: 'room-type-id', status: 'ACTIVE', roomType: { deletedAt: null } }, orderBy: [{ priority: 'desc' }, { id: 'asc' }] });
  });
});
