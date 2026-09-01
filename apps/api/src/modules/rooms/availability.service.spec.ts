import { AvailabilityService } from './availability.service';

describe('AvailabilityService', () => {
  it('queries only active rooms with no overlapping block or booking occupancy', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AvailabilityService({ roomType: { findMany } } as never);
    await service.search('2099-01-10', '2099-01-12', 2);
    const range = { gte: new Date('2099-01-10T00:00:00.000Z'), lt: new Date('2099-01-12T00:00:00.000Z') };
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ maxTotalGuests: { gte: 2 }, rooms: { some: expect.objectContaining({ blocks: { none: { cancelledAt: null, startDate: { lt: range.lt }, endDate: { gt: range.gte } } }, occupancies: { none: { stayDate: range } } }) } }) }));
  });
  it('rejects invalid date ranges and guest counts', async () => {
    const service = new AvailabilityService({ roomType: { findMany: jest.fn() } } as never);
    await expect(service.search('2099-01-10', '2099-01-10', 1)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'INVALID_AVAILABILITY_QUERY' }) });
    await expect(service.search('2099-01-10', '2099-01-11', 0)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'INVALID_AVAILABILITY_QUERY' }) });
  });
});
