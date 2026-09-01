import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

/** Tech Spec §35.2: contact form is limited to 3 submissions per 10 minutes per IP. */
const WINDOW_MS = 600_000;
const MAX_SUBMISSIONS_PER_WINDOW = 3;

/**
 * In-process limiter, matching the pattern already used for booking lookup and
 * public payment status. A shared store is required before multi-instance
 * production; see the task note.
 */
@Injectable()
export class ContactRateLimitService {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  check(ipAddress: string | undefined): void {
    const now = Date.now();
    const key = hashIp(ipAddress);
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }

    if (current.count >= MAX_SUBMISSIONS_PER_WINDOW) {
      throw new HttpException(
        { code: 'CONTACT_RATE_LIMITED', message: 'Please try again later' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
  }
}

/** IP is stored and keyed as a hash so raw addresses never reach the database or logs. */
export function hashIp(ipAddress: string | undefined): string {
  return createHash('sha256').update(ipAddress ?? 'unknown').digest('hex');
}
