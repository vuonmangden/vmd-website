import { Injectable } from '@nestjs/common';
import type {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const incoming = req.headers[CORRELATION_ID_HEADER];
    const raw = Array.isArray(incoming) ? incoming[0] : incoming;
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const correlationId =
      typeof raw === 'string' && uuidPattern.test(raw) ? raw : randomUUID();

    req.headers[CORRELATION_ID_HEADER] = correlationId;
    (req as Request & { correlationId: string }).correlationId = correlationId;

    return next.handle().pipe(
      tap(() => {
        res.setHeader(CORRELATION_ID_HEADER, correlationId);
      }),
    );
  }
}
