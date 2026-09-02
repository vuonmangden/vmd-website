import { HttpException } from '@nestjs/common';
import { PublicBookingRateLimitService } from './public-booking-rate-limit.service';

describe('PublicBookingRateLimitService', () => {
  it('allows five creates per minute per hashed IP and resets after the window', () => {
    const service = new PublicBookingRateLimitService();
    for (let count = 0; count < 5; count += 1) expect(() => service.check('198.51.100.10', 1_000)).not.toThrow();
    expect(() => service.check('198.51.100.10', 1_001)).toThrow(HttpException);
    expect(() => service.check('198.51.100.10', 61_000)).not.toThrow();
  });
});
