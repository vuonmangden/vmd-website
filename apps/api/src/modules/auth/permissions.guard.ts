import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './auth.types';
import { REQUIRED_PERMISSIONS } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];

    if (required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const available = new Set(request.actor?.permissions ?? []);
    if (!request.actor || required.some((permission) => !available.has(permission))) {
      throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Permission denied' });
    }

    return true;
  }
}
