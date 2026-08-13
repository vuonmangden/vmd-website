import { LoginRateLimitService } from './login-rate-limit.service';

describe('LoginRateLimitService', () => {
  it('locks an account and source IP after five failures, then expires the lockout', () => {
    const service = new LoginRateLimitService();
    const now = 1_000_000;
    for (let index = 0; index < 5; index += 1) service.recordFailure('staff@example.test', '198.51.100.4', now);

    expect(() => service.assertAllowed('staff@example.test', '198.51.100.4', now)).toThrow(expect.objectContaining({ status: 429 }));
    expect(() => service.assertAllowed('staff@example.test', '198.51.100.4', now + 15 * 60 * 1_000)).not.toThrow();
  });

  it('applies the IP limit across account names and resets only after a successful account login', () => {
    const service = new LoginRateLimitService();
    const now = 1_000_000;
    for (let index = 0; index < 5; index += 1) service.recordFailure(`staff${index}@example.test`, '198.51.100.4', now);

    expect(() => service.assertAllowed('another@example.test', '198.51.100.4', now)).toThrow(expect.objectContaining({ status: 429 }));
    service.resetAccount('staff0@example.test');
    expect(() => service.assertAllowed('staff0@example.test', '198.51.100.5', now)).not.toThrow();
  });
});
