import { HttpException } from '@nestjs/common';
import { BookingLookupRateLimitService } from './booking-lookup-rate-limit.service';

describe('BookingLookupRateLimitService', () => {
  it('locks an IP after five failures and lets it retry after fifteen minutes', () => {
    const service = new BookingLookupRateLimitService();
    for (let index = 0; index < 5; index += 1) service.recordFailure('198.51.100.10', 1_000);
    expect(() => service.assertAllowed('198.51.100.10', 1_001)).toThrow(HttpException);
    expect(() => service.assertAllowed('198.51.100.10', 901_001)).not.toThrow();
  });
});
