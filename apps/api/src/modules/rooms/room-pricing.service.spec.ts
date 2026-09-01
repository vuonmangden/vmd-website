import { RoomPricingService } from './room-pricing.service';

describe('RoomPricingService', () => {
  const roomType = { standardAdults: 2, maxAdults: 3, maxChildren: 1, maxTotalGuests: 3 };

  it('loads capacity and active rules for the requested production room type', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const findFirst = jest.fn().mockResolvedValue(roomType);
    const quote = jest.fn().mockReturnValue({ total: 0n });
    const service = new RoomPricingService({ roomType: { findFirst }, roomRateRule: { findMany } } as never, { quote } as never);
    await expect(service.quote('room-type-id', '2099-01-01', '2099-01-02', 1, 0)).resolves.toEqual({ total: 0n });
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'room-type-id', status: 'ACTIVE', deletedAt: null }, select: { standardAdults: true, maxAdults: true, maxChildren: true, maxTotalGuests: true } });
    expect(findMany).toHaveBeenCalledWith({ where: { roomTypeId: 'room-type-id', status: 'ACTIVE', roomType: { deletedAt: null } }, orderBy: [{ priority: 'desc' }, { id: 'asc' }] });
    expect(quote).toHaveBeenCalledWith([], '2099-01-01', '2099-01-02', 1, 0, 2);
  });

  it('fails closed when the room type is inactive or guest count exceeds capacity', async () => {
    const findMany = jest.fn();
    const findFirst = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(roomType);
    const service = new RoomPricingService({ roomType: { findFirst }, roomRateRule: { findMany } } as never, { quote: jest.fn() } as never);
    await expect(service.quote('room-type-id', '2099-01-01', '2099-01-02', 1, 0)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'INVALID_ROOM_CAPACITY' }) });
    await expect(service.quote('room-type-id', '2099-01-01', '2099-01-02', 4, 0)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'INVALID_ROOM_CAPACITY' }) });
    expect(findMany).not.toHaveBeenCalled();
  });
});
