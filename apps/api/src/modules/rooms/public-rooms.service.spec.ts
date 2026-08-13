import { PublicRoomsService } from './public-rooms.service';

describe('PublicRoomsService', () => {
  const record = { name: 'Pine', slug: 'pine', shortDescription: 'Synthetic', description: 'Synthetic room', standardAdults: 2, maxAdults: 2, maxChildren: 1, maxTotalGuests: 3, bedConfiguration: ['1 king'], amenities: ['wifi'] };

  it('maps active catalogue records to safe fields only', async () => {
    const findMany = jest.fn().mockResolvedValue([record]);
    const service = new PublicRoomsService({ roomType: { findMany } } as never, {} as never);
    await expect(service.list()).resolves.toEqual({ items: [expect.objectContaining({ slug: 'pine', isSandbox: true, capacity: { standardAdults: 2, maxAdults: 2, maxChildren: 1, maxTotalGuests: 3 } })] });
    expect(JSON.stringify(await service.list())).not.toContain('id');
  });

  it('queries availability internally without selecting physical room data', async () => {
    const findMany = jest.fn().mockResolvedValue([record]);
    const service = new PublicRoomsService({ roomType: { findMany } } as never, {} as never);
    await expect(service.availability('2099-01-10', '2099-01-12', 2)).resolves.toEqual({ items: [expect.objectContaining({ slug: 'pine' })] });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ select: expect.not.objectContaining({ id: true }) }));
  });

  it('removes internal rate rule ids from public quotes', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'private-id' });
    const quote = jest.fn().mockResolvedValue({ nightlySubtotal: 100000n, extraGuestSubtotal: 0n, total: 100000n, nights: 1, appliedRuleIds: ['private-rule'] });
    const service = new PublicRoomsService({ roomType: { findFirst } } as never, { quote } as never);
    await expect(service.quote('pine', '2099-01-10', '2099-01-11', 1, 0)).resolves.toEqual({ currency: 'VND', nights: 1, nightlySubtotal: 100000, extraGuestSubtotal: 0, total: 100000, isSandbox: true });
    expect(quote).toHaveBeenCalledWith('private-id', '2099-01-10', '2099-01-11', 1, 0);
  });
});
