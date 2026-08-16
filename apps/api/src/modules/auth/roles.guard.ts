import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Reflector } from '@nestjs/core';
import { type StaffRole, type Permission, ROLE_PERMISSIONS } from './roles';
import { ROLES_KEY, PERMISSIONS_KEY } from './roles.decorator';

interface StaffRequest {
  staff?: { role: StaffRole };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<StaffRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<StaffRequest>();
    const staff = request.staff;
    if (!staff) {
      throw new ForbiddenException('Access denied');
    }

    if (!requiredRoles.includes(staff.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<StaffRequest>();
    const staff = request.staff;
    if (!staff) {
      throw new ForbiddenException('Access denied');
    }

    const rolePermissions = ROLE_PERMISSIONS[staff.role];
    if (!rolePermissions) {
      throw new ForbiddenException('Unknown role');
    }

    const hasAll = requiredPermissions.every((p) => rolePermissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
