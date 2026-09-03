import { Inject, Injectable, Optional } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_HEALTH_CLIENT = 'REDIS_HEALTH_CLIENT';

function defaultClient(): Redis {
  return new Redis({
    host: process.env['REDIS_HOST'] ?? '127.0.0.1',
    port: Number.parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    lazyConnect: true,
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    // Disables ioredis's default forever-retry-with-backoff. Without this, a
    // failed connection attempt keeps retrying indefinitely and the promise
    // this service awaits never settles.
    retryStrategy: () => null,
  });
}

/**
 * A dedicated client for the `/health/dependencies` Redis check, deliberately
 * independent of `QueueModule`/BullMQ — importing `QueueModule` here would
 * pull in all 9 registered queues, each opening its own real Redis
 * connection the moment the module compiles (including in unit tests, where
 * `app.module.spec.ts` only mocks one queue token).
 *
 * Constructor uses `@Optional() @Inject(REDIS_HEALTH_CLIENT)` rather than a
 * plain typed parameter with a default value — Nest's DI tries to resolve a
 * plain-typed constructor parameter by type, finds no provider for `Redis`,
 * and throws `UnknownDependenciesException` at real app boot (this exact
 * class of bug was found live in SEC-002, in `ResourceHoldsService`). A
 * string-token `@Inject` with `@Optional()` tells Nest it's fine to inject
 * `undefined` when nothing provides that token, which is when the default
 * parameter value actually applies.
 */
@Injectable()
export class RedisHealthService implements OnModuleDestroy {
  constructor(@Optional() @Inject(REDIS_HEALTH_CLIENT) private readonly client: Redis = defaultClient()) {}

  async isHealthy(): Promise<boolean> {
    try {
      if (this.client.status !== 'ready') await this.client.connect();
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
