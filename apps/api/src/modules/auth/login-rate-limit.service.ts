import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1_000;
const MAX_FAILURES = 5;

interface AttemptBucket {
  failures: number;
  expiresAt: number;
}

@Injectable()
export class LoginRateLimitService {
  private readonly logger = new Logger(LoginRateLimitService.name);
  private readonly accountAttempts = new Map<string, AttemptBucket>();
  private readonly ipAttempts = new Map<string, AttemptBucket>();

  assertAllowed(email: string, ipAddress: string, now = Date.now()): void {
    if (this.isLocked(this.accountAttempts, email, now) || this.isLocked(this.ipAttempts, ipAddress, now)) {
      this.logger.warn({ event: 'auth_rate_limited', account: hashForLog(email), ipAddress: hashForLog(ipAddress) });
      throw rateLimited();
    }
  }

  recordFailure(email: string, ipAddress: string, now = Date.now()): void {
    this.increment(this.accountAttempts, email, now);
    this.increment(this.ipAttempts, ipAddress, now);
  }

  resetAccount(email: string): void {
    this.accountAttempts.delete(email);
  }

  private isLocked(buckets: Map<string, AttemptBucket>, key: string, now: number): boolean {
    const bucket = buckets.get(key);
    if (!bucket) return false;
    if (bucket.expiresAt <= now) {
      buckets.delete(key);
      return false;
    }
    return bucket.failures >= MAX_FAILURES;
  }

  private increment(buckets: Map<string, AttemptBucket>, key: string, now: number): void {
    const existing = buckets.get(key);
    if (!existing || existing.expiresAt <= now) {
      buckets.set(key, { failures: 1, expiresAt: now + WINDOW_MS });
      return;
    }
    existing.failures += 1;
  }
}

function rateLimited(): HttpException {
  return new HttpException({
    code: 'AUTHENTICATION_RATE_LIMITED',
    message: 'Authentication is temporarily unavailable',
  }, HttpStatus.TOO_MANY_REQUESTS);
}

function hashForLog(value: string): string {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return `h${Math.abs(hash)}`;
}
