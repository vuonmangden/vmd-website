import { Injectable } from '@nestjs/common';
import type {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import { CORRELATION_ID_HEADER } from './correlation-id.interceptor';
import type { ApiSuccessResponse } from '../dto/api-response.dto';
import type { Request } from 'express';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data: unknown): ApiSuccessResponse | unknown => {
        if (isAlreadyFormatted(data)) {
          return data;
        }

        const correlationId =
          (req.headers[CORRELATION_ID_HEADER] as string) ?? '';

        return {
          data: data ?? null,
          meta: {},
          correlationId,
        };
      }),
    );
  }
}

function isAlreadyFormatted(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return 'status' in obj && typeof obj['status'] === 'string';
}
