import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { MetricsService } from './metrics.service';

/**
 * `@Res()` (no `passthrough`) deliberately bypasses the global
 * `ResponseTransformInterceptor` — a Prometheus scraper needs the exact
 * plaintext exposition format at this path, not the `{data, meta,
 * correlationId}` envelope every other endpoint returns. There's no other
 * way to serve raw text through that global interceptor. Excluded from
 * Swagger since this isn't a client-facing API response.
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  get(@Res() response: Response): void {
    response.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    response.send(this.metrics.render());
  }
}
