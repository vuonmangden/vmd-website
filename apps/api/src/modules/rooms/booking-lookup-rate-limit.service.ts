import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;

@Injectable()
export class BookingLookupRateLimitService {
  private readonly attempts = new Map<string, { failures: number; expiresAt: number }>();
  assertAllowed(ip: string, now = Date.now()) {
    const value = this.attempts.get(ip);
    if (value && value.expiresAt > now && value.failures >= MAX_FAILURES) throw new HttpException({ code: 'BOOKING_LOOKUP_UNAVAILABLE', message: 'Booking lookup is temporarily unavailable' }, HttpStatus.TOO_MANY_REQUESTS);
    if (value && value.expiresAt <= now) this.attempts.delete(ip);
  }
  recordFailure(ip: string, now = Date.now()) {
    const value = this.attempts.get(ip);
    if (!value || value.expiresAt <= now) this.attempts.set(ip, { failures: 1, expiresAt: now + WINDOW_MS }); else value.failures += 1;
  }
  reset(ip: string) { this.attempts.delete(ip); }
}
