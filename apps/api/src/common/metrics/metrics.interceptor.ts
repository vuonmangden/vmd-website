import { Injectable } from '@nestjs/common';
import type { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { Request, Response } from 'express';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const start = process.hrtime.bigint();
    const method = request.method;
    const route = routeLabel(request);

    /**
     * `response.statusCode` is not yet the final code at the moment an
     * interceptor's RxJS pipe observes an error — Nest's exception filter
     * (which actually sets it, e.g. 404/401) runs after this interceptor's
     * chain unwinds, so a `tap({ error })` here would record whatever
     * Express's default (200) still is. The Node `finish` event fires only
     * once the response has actually been sent, so it reflects the true
     * status code for both success and exception-filter paths alike.
     */
    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      this.metrics.recordRequest(method, route, response.statusCode, durationMs);
    });

    return next.handle();
  }
}

/**
 * The registered route pattern (e.g. `/api/v1/admin/bookings/:id`), never
 * the raw URL — using the raw URL would put a fresh label per booking ID
 * ever requested, an unbounded-cardinality time series that only grows.
 */
function routeLabel(request: Request): string {
  const route = (request as Request & { route?: { path?: string } }).route?.path;
  return route ?? 'unmatched';
}
