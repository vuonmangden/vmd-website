import { OccupancyService } from './occupancy.service';

describe('OccupancyService', () => {
  it('writes one occupancy per stay night in one transaction', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 2 }); const transaction = jest.fn((operation) => operation({ roomOccupancy: { createMany } }));
    const service = new OccupancyService({ $transaction: transaction } as never);
    await expect(service.reserve('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000009', '2099-01-10', '2099-01-12', 'HOLD')).resolves.toEqual({ count: 2 });
    expect(createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([expect.objectContaining({ stayDate: new Date('2099-01-10T00:00:00.000Z') }), expect.objectContaining({ stayDate: new Date('2099-01-11T00:00:00.000Z') })]) });
  });
  it('rejects an invalid range before opening a transaction', async () => {
    const transaction = jest.fn(); const service = new OccupancyService({ $transaction: transaction } as never);
    await expect(service.reserve('room', 'booking', '2099-01-10', '2099-01-10', 'HOLD')).rejects.toMatchObject({ response: expect.objectContaining({ code: 'INVALID_STAY_RANGE' }) });
    expect(transaction).not.toHaveBeenCalled();
  });
});
