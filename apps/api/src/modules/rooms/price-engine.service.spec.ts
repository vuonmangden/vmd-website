import { PriceEngineService } from './price-engine.service';

const rule = (overrides = {}) => ({ id: 'seasonal', dateFrom: new Date('2099-01-01T00:00:00.000Z'), dateTo: new Date('2099-02-01T00:00:00.000Z'), daysOfWeek: [], nightlyPrice: 1000000n, extraAdultPrice: 100000n, extraChildPrice: 50000n, minNights: 1, maxNights: null, priority: 1, status: 'ACTIVE', ...overrides });

describe('PriceEngineService', () => {
  const service = new PriceEngineService();
  it('calculates integer VND per night without charging adults inside standard capacity', () => {
    expect(service.quote([rule()], '2099-01-10', '2099-01-12', 2, 1, 2)).toEqual({ nightlySubtotal: 2000000n, extraGuestSubtotal: 100000n, total: 2100000n, nights: 2, appliedRuleIds: ['seasonal', 'seasonal'] });
  });
  it('charges only adults above standard capacity', () => {
    expect(service.quote([rule()], '2099-01-10', '2099-01-12', 3, 0, 2).extraGuestSubtotal).toBe(200000n);
  });
  it('selects the highest priority matching rule deterministically', () => {
    const preferred = rule({ id: 'preferred', nightlyPrice: 1200000n, priority: 10 });
    expect(service.quote([rule(), preferred], '2099-01-10', '2099-01-11', 1, 0, 2).appliedRuleIds).toEqual(['preferred']);
  });
  it('uses weekday filtering and fails closed when no active rule matches', () => {
    const friday = rule({ id: 'friday', daysOfWeek: [5] });
    expect(service.quote([friday], '2099-01-02', '2099-01-03', 1, 0, 2).appliedRuleIds).toEqual(['friday']);
    expect(() => service.quote([friday], '2099-01-03', '2099-01-04', 1, 0, 2)).toThrow('Price quote');
  });
  it('rejects invalid ranges, guests and min/max-night violations', () => {
    expect(() => service.quote([rule()], '2099-01-10', '2099-01-10', 1, 0, 2)).toThrow();
    expect(() => service.quote([rule()], '2099-01-10', '2099-01-11', 0, 0, 2)).toThrow();
    expect(() => service.quote([rule()], '2099-01-10', '2099-01-11', 1, 0, 0)).toThrow();
    expect(() => service.quote([rule({ minNights: 2 })], '2099-01-10', '2099-01-11', 1, 0, 2)).toThrow();
  });
});
