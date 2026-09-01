import { PublicRoomsService } from './public-rooms.service';

describe('PublicRoomsService', () => {
  const record = { name: 'Pine', slug: 'pine', shortDescription: 'Synthetic', description: 'Synthetic room', standardAdults: 2, maxAdults: 2, maxChildren: 1, maxTotalGuests: 3, bedConfiguration: ['1 king'], amenities: ['wifi'] };
  const setting = { value: { version: '2026-09-01.v1', pricesIncludeVat: false, extraMattress: { maxPerRoom: 1, guestCapacityPerMattress: 1, price: 200000, currency: 'VND' } } };
  const policy = { pricesIncludeVat: false, extraMattress: { maxPerRoom: 1, guestCapacityPerMattress: 1, price: 200000, currency: 'VND' } };

  it('maps active production catalogue records and approved commercial policy to safe fields only', async () => {
    const findMany = jest.fn().mockResolvedValue([record]);
    const service = new PublicRoomsService({ roomType: { findMany }, appSetting: { findUnique: jest.fn().mockResolvedValue(setting) } } as never, {} as never);
    await expect(service.list()).resolves.toEqual({ items: [expect.objectContaining({ slug: 'pine', isSandbox: false, ...policy, capacity: { standardAdults: 2, maxAdults: 2, maxChildren: 1, maxTotalGuests: 3 } })] });
    expect(JSON.stringify(await service.list())).not.toContain('id');
  });

  it('queries availability without selecting physical room data and excludes occupancy', async () => {
    const findMany = jest.fn().mockResolvedValue([record]);
    const service = new PublicRoomsService({ roomType: { findMany }, appSetting: { findUnique: jest.fn().mockResolvedValue(setting) } } as never, {} as never);
    await expect(service.availability('2099-01-10', '2099-01-12', 2)).resolves.toEqual({ items: [expect.objectContaining({ slug: 'pine' })] });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ select: expect.not.objectContaining({ id: true }) }));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ rooms: { some: expect.objectContaining({ occupancies: { none: { stayDate: { gte: new Date('2099-01-10T00:00:00.000Z'), lt: new Date('2099-01-12T00:00:00.000Z') } } } }) } }) }));
  });

  it('removes internal rate rule ids from public quotes', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'private-id' });
    const quote = jest.fn().mockResolvedValue({ nightlySubtotal: 100000n, extraGuestSubtotal: 0n, total: 100000n, nights: 1, appliedRuleIds: ['private-rule'] });
    const service = new PublicRoomsService({ roomType: { findFirst }, appSetting: { findUnique: jest.fn().mockResolvedValue(setting) } } as never, { quote } as never);
    await expect(service.quote('pine', '2099-01-10', '2099-01-11', 1, 0)).resolves.toEqual({ currency: 'VND', nights: 1, nightlySubtotal: 100000, extraGuestSubtotal: 0, total: 100000, isSandbox: false, ...policy });
    expect(quote).toHaveBeenCalledWith('private-id', '2099-01-10', '2099-01-11', 1, 0);
  });

  it('fails closed when the production catalog marker is missing or malformed', async () => {
    const service = new PublicRoomsService({ roomType: { findMany: jest.fn().mockResolvedValue([]) }, appSetting: { findUnique: jest.fn().mockResolvedValue(null) } } as never, {} as never);
    await expect(service.list()).rejects.toMatchObject({ response: expect.objectContaining({ code: 'ROOM_CATALOG_NOT_READY' }) });
  });
});
