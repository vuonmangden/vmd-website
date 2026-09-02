import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

const WINDOW_MS = 60_000;
const MAX_CREATES_PER_WINDOW = 5;
const MAX_TRACKED_CLIENTS = 10_000;

/**
 * SEC-001: the public BBQ reservation endpoint had no rate limit at all,
 * unlike its room-booking equivalent (`PublicBookingRateLimitService`,
 * mirrored here) — a caller could repeatedly hit the fixed 120-guest daily
 * quota with fabricated reservations and deny it to real guests. Same
 * application-safety-net caveat applies: REL-001 also configures the shared
 * edge/WAF limit before multiple API replicas are enabled.
 */
@Injectable()
export class PublicBbqRateLimitService {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();
  private lastPrunedAt = 0;

  check(ipAddress: string | undefined, now = Date.now()): void {
    if (now - this.lastPrunedAt >= WINDOW_MS) {
      for (const [storedKey, value] of this.attempts) {
        if (value.resetAt <= now) this.attempts.delete(storedKey);
      }
      this.lastPrunedAt = now;
    }
    const key = createHash('sha256').update(ipAddress ?? 'unknown').digest('hex');
    const current = this.attempts.get(key);
    if (!current || current.resetAt <= now) {
      if (!current && this.attempts.size >= MAX_TRACKED_CLIENTS) throw limited();
      this.attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }
    if (current.count >= MAX_CREATES_PER_WINDOW) {
      throw limited();
    }
    current.count += 1;
  }
}

function limited() {
  return new HttpException({ code: 'BBQ_RESERVATION_CREATE_RATE_LIMITED', message: 'Please try again later' }, HttpStatus.TOO_MANY_REQUESTS);
}
