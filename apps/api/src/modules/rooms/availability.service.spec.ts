import { AvailabilityService } from './availability.service';

describe('AvailabilityService', () => {
  it('queries only active rooms with no overlapping active block', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AvailabilityService({ roomType: { findMany } } as never);
    await service.search('2099-01-10', '2099-01-12', 2);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ maxTotalGuests: { gte: 2 }, rooms: { some: expect.objectContaining({ blocks: { none: { cancelledAt: null, startDate: { lt: new Date('2099-01-12T00:00:00.000Z') }, endDate: { gt: new Date('2099-01-10T00:00:00.000Z') } } } }) } }) }));
  });
  it('rejects invalid date ranges and guest counts', async () => {
    const service = new AvailabilityService({ roomType: { findMany: jest.fn() } } as never);
    await expect(service.search('2099-01-10', '2099-01-10', 1)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'INVALID_AVAILABILITY_QUERY' }) });
    await expect(service.search('2099-01-10', '2099-01-11', 0)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'INVALID_AVAILABILITY_QUERY' }) });
  });
});
