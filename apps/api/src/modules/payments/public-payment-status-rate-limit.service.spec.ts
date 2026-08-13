import { HttpException } from '@nestjs/common';
import { PublicPaymentStatusRateLimitService } from './public-payment-status-rate-limit.service';

describe('PublicPaymentStatusRateLimitService', () => {
  it('permits a bounded number of opaque-reference reads per address', () => {
    const service = new PublicPaymentStatusRateLimitService();
    for (let count = 0; count < 30; count += 1) service.check('203.0.113.4');
    expect(() => service.check('203.0.113.4')).toThrow(HttpException);
  });

  it('keeps counters separate without retaining a raw address', () => {
    const service = new PublicPaymentStatusRateLimitService();
    for (let count = 0; count < 30; count += 1) service.check('203.0.113.4');
    expect(() => service.check('203.0.113.5')).not.toThrow();
  });
});
