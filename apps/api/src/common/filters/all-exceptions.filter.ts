import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { CORRELATION_ID_HEADER } from '../interceptors/correlation-id.interceptor';
import type { ApiErrorResponse } from '../dto/api-response.dto';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) ?? '';

    let status: number;
    let code: string;
    let message: string;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        code = (resp['code'] as string) ?? httpStatusToCode(status);
        message = (resp['message'] as string) ?? exception.message;
        if (Array.isArray(resp['message'])) {
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = { fields: resp['message'] };
        }
        if (resp['details'] !== undefined) {
          details = resp['details'] as Record<string, unknown>;
        }
      } else {
        code = httpStatusToCode(status);
        message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : exception.message;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';

      this.logger.error(
        {
          correlationId,
          event: 'unhandled_exception',
          error:
            exception instanceof Error ? exception.message : String(exception),
        },
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    const body: ApiErrorResponse = {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
        correlationId,
      },
    };

    res.status(status).json(body);
  }
}

function httpStatusToCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'TOO_MANY_REQUESTS';
    default:
      return 'INTERNAL_ERROR';
  }
}
