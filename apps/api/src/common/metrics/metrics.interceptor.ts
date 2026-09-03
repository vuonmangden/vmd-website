import { Injectable } from '@nestjs/common';
import type { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';
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

    const record = (): void => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      this.metrics.recordRequest(request.method, routeLabel(request), response.statusCode, durationMs);
    };

    return next.handle().pipe(tap({ next: record, error: record }));
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
