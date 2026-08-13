import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

/** Small, deliberately local limiter for a low-information public status read.
 * A shared production limiter can replace this without changing the endpoint contract. */
@Injectable()
export class PublicPaymentStatusRateLimitService {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  check(ipAddress: string | undefined): void {
    const now = Date.now();
    const key = createHash('sha256').update(ipAddress ?? 'unknown').digest('hex');
    const current = this.attempts.get(key);
    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }
    if (current.count >= MAX_REQUESTS_PER_WINDOW) {
      throw new HttpException({ code: 'PAYMENT_STATUS_RATE_LIMITED', message: 'Please try again later' }, HttpStatus.TOO_MANY_REQUESTS);
    }
    current.count += 1;
  }
}
