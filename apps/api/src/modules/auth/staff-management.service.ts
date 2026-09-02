import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { SupabaseAdminService } from './supabase-admin.service';
import { sanitize } from '../audit/audit.service';
import type { AuthenticatedActor } from './auth.types';

export const STAFF_STATUSES = ['INVITED', 'ACTIVE', 'SUSPENDED'] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export interface ListStaffOptions {
  status?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class StaffManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  /**
   * Invites a new staff member: creates the Supabase Auth user (which sends
   * the invite email) via the Admin API, then a matching INVITED profile.
   * The caller is expected to assign a starting role afterward via
   * RolesService — kept separate to match the existing assign/revoke split.
   */
  async invite(actor: AuthenticatedActor, input: { email: string; fullName: string }, correlationId: string) {
    assertUserManager(actor);

    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();
    if (!email || !fullName) {
      throw new BadRequestException({ code: 'STAFF_INVITE_INVALID', message: 'Email and full name are required' });
    }

    const existing = await this.prisma.staffProfile.findFirst({ where: { email } });
    if (existing) {
      throw new ConflictException({ code: 'STAFF_EMAIL_ALREADY_EXISTS', message: 'A staff profile with this email already exists' });
    }

    const invited = await this.supabaseAdmin.inviteUserByEmail(email);

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.staffProfile.create({
        data: { authUserId: invited.id, fullName, email, status: 'INVITED' },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'STAFF',
          actorId: actor.staffProfileId,
          action: 'staff.invited',
          resourceType: 'staff_profile',
          resourceId: profile.id,
          afterData: sanitize({ email, fullName, status: 'INVITED' }),
          correlationId,
        },
      });
      return { id: profile.id, email: profile.email, fullName: profile.fullName, status: profile.status };
    });
  }

  async list(actor: AuthenticatedActor, options: ListStaffOptions) {
    assertUserManager(actor);

    if (options.status && !isStaffStatus(options.status)) {
      throw new BadRequestException({
        code: 'STAFF_STATUS_INVALID',
        message: 'Unknown status filter',
      });
    }

    const where = options.status ? { status: options.status } : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.staffProfile.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          roleAssignments: { select: { role: { select: { code: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.staffProfile.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        email: row.email,
        status: row.status,
        lastLoginAt: row.lastLoginAt,
        createdAt: row.createdAt,
        roles: row.roleAssignments.map((assignment) => assignment.role.code),
      })),
      page: options.page,
      pageSize: options.pageSize,
      total,
    };
  }

  async detail(actor: AuthenticatedActor, staffId: string) {
    assertUserManager(actor);

    const staff = await this.prisma.staffProfile.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        roleAssignments: {
          select: {
            assignedAt: true,
            role: { select: { code: true, name: true } },
            assigner: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Staff not found' });
    }

    return staff;
  }

  /**
   * Activates or suspends a staff member. Suspending immediately blocks their
   * sessions because IAM-001 only builds an actor from an ACTIVE profile.
   */
  async changeStatus(
    actor: AuthenticatedActor,
    staffId: string,
    status: string,
    reason: string | undefined,
    correlationId: string,
  ) {
    assertUserManager(actor);

    if (!isStaffStatus(status)) {
      throw new BadRequestException({ code: 'STAFF_STATUS_INVALID', message: 'Unknown status' });
    }

    // Suspending yourself would lock the acting administrator out mid-session.
    if (actor.staffProfileId === staffId) {
      throw new ForbiddenException({
        code: 'SELF_STATUS_CHANGE_DENIED',
        message: 'Self status changes are not allowed',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.staffProfile.findUnique({
        where: { id: staffId },
        select: { status: true },
      });
      if (!existing) {
        throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Staff not found' });
      }

      // Removing the last usable Super Admin would leave nobody able to manage
      // users, mirroring the guard RolesService applies to role revocation.
      if (status !== 'ACTIVE' && existing.status === 'ACTIVE') {
        const remainingSuperAdmins = await tx.staffRoleAssignment.count({
          where: {
            role: { code: 'SUPER_ADMIN' },
            staffId: { not: staffId },
            staff: { status: 'ACTIVE' },
          },
        });

        const targetIsSuperAdmin = await tx.staffRoleAssignment.findFirst({
          where: { staffId, role: { code: 'SUPER_ADMIN' } },
          select: { staffId: true },
        });

        if (targetIsSuperAdmin && remainingSuperAdmins === 0) {
          throw new ConflictException({
            code: 'LAST_SUPER_ADMIN',
            message: 'The last active Super Admin cannot be suspended',
          });
        }
      }

      const updated = await tx.staffProfile.update({
        where: { id: staffId },
        data: { status },
        select: { id: true, status: true },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'STAFF',
          actorId: actor.staffProfileId,
          action: 'staff.status.changed',
          resourceType: 'staff_profile',
          resourceId: staffId,
          beforeData: { status: existing.status },
          afterData: { status },
          reason: reason?.trim() || null,
          correlationId,
        },
      });

      return updated;
    });
  }
}

function assertUserManager(actor: AuthenticatedActor): void {
  if (!actor.roles.includes('SUPER_ADMIN') || !actor.permissions.includes('user.manage')) {
    throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Permission denied' });
  }
}

function isStaffStatus(value: string): value is StaffStatus {
  return (STAFF_STATUSES as readonly string[]).includes(value);
}
