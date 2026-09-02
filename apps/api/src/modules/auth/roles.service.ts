import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from './auth.types';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async assignRole(
    actor: AuthenticatedActor,
    targetStaffId: string,
    roleCode: string,
    correlationId: string,
  ): Promise<void> {
    assertUserManager(actor);
    if (actor.staffProfileId === targetStaffId) throw privilegeEscalationDenied();

    await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { code: roleCode }, select: { id: true, code: true, isSystem: true } });
      if (!role?.isSystem) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });

      const staff = await tx.staffProfile.findUnique({ where: { id: targetStaffId }, select: { id: true } });
      if (!staff) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Staff not found' });

      await tx.staffRoleAssignment.upsert({
        where: { staffId_roleId: { staffId: targetStaffId, roleId: role.id } },
        update: { assignedBy: actor.staffProfileId, assignedAt: new Date() },
        create: { staffId: targetStaffId, roleId: role.id, assignedBy: actor.staffProfileId },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'STAFF', actorId: actor.staffProfileId, action: 'staff.role.assign',
          resourceType: 'staff_profile', resourceId: targetStaffId,
          afterData: { roleCode: role.code }, correlationId,
        },
      });
    });
  }

  async revokeRole(
    actor: AuthenticatedActor,
    targetStaffId: string,
    roleCode: string,
    correlationId: string,
  ): Promise<void> {
    assertUserManager(actor);
    if (actor.staffProfileId === targetStaffId) throw privilegeEscalationDenied();

    await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { code: roleCode }, select: { id: true, code: true, isSystem: true } });
      if (!role?.isSystem) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });

      const assignment = await tx.staffRoleAssignment.findUnique({
        where: { staffId_roleId: { staffId: targetStaffId, roleId: role.id } },
        select: { staffId: true },
      });
      if (!assignment) throw new NotFoundException({ code: 'ROLE_ASSIGNMENT_NOT_FOUND', message: 'Role assignment not found' });

      if (role.code === 'SUPER_ADMIN') {
        // SEC-001: scoped to ACTIVE holders, matching the equivalent guard in
        // staff-management.service.ts's changeStatus() — an assignment held
        // by a SUSPENDED/INVITED profile can't actually manage users, so it
        // must not count toward "there's still another Super Admin".
        const count = await tx.staffRoleAssignment.count({ where: { roleId: role.id, staff: { status: 'ACTIVE' } } });
        if (count <= 1) {
          throw new ConflictException({ code: 'LAST_SUPER_ADMIN', message: 'The last Super Admin cannot be removed' });
        }
      }

      await tx.staffRoleAssignment.delete({ where: { staffId_roleId: { staffId: targetStaffId, roleId: role.id } } });
      await tx.auditLog.create({
        data: {
          actorType: 'STAFF', actorId: actor.staffProfileId, action: 'staff.role.revoke',
          resourceType: 'staff_profile', resourceId: targetStaffId,
          beforeData: { roleCode: role.code }, correlationId,
        },
      });
    });
  }
}

function assertUserManager(actor: AuthenticatedActor): void {
  if (!actor.roles.includes('SUPER_ADMIN') || !actor.permissions.includes('user.manage')) {
    throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Permission denied' });
  }
}

function privilegeEscalationDenied(): ForbiddenException {
  return new ForbiddenException({ code: 'SELF_ROLE_CHANGE_DENIED', message: 'Self role changes are not allowed' });
}
