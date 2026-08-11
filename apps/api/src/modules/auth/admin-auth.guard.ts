import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../../common/interceptors/correlation-id.interceptor';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { AuthService } from './auth.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const value = request.headers[CORRELATION_ID_HEADER];
    const correlationId = Array.isArray(value) ? value[0] ?? '' : value ?? '';
    await this.authService.getActorForRequest(request, correlationId);
    return true;
  }
}
