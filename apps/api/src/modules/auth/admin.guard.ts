import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Reflector } from '@nestjs/core';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { type StaffRole, type Permission, ROLE_PERMISSIONS } from './roles';
import { ROLES_KEY, PERMISSIONS_KEY } from './roles.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly authGuard: SupabaseAuthGuard,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = await this.authGuard.canActivate(context);
    if (!isAuthenticated) {
      throw new UnauthorizedException();
    }

    const requiredRoles = this.reflector.getAllAndOverride<StaffRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      const request = context.switchToHttp().getRequest<{ staff?: { role: StaffRole } }>();
      if (!request.staff || !requiredRoles.includes(request.staff.role)) {
        throw new ForbiddenException('Insufficient role');
      }
    }

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermissions && requiredPermissions.length > 0) {
      const request = context.switchToHttp().getRequest<{ staff?: { role: StaffRole } }>();
      if (!request.staff) {
        throw new ForbiddenException('Access denied');
      }
      const rolePermissions = ROLE_PERMISSIONS[request.staff.role];
      if (!rolePermissions) {
        throw new ForbiddenException('Unknown role');
      }
      const hasAll = requiredPermissions.every((p) => rolePermissions.includes(p));
      if (!hasAll) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
