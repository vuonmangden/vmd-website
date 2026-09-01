import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StaffManagementService } from './staff-management.service';
import type { AuthenticatedActor } from './auth.types';

function supabaseAdminMock(invitedId = '00000000-0000-4000-8000-000000000099') {
  return { inviteUserByEmail: jest.fn().mockResolvedValue({ id: invitedId }) };
}

const CORRELATION_ID = '00000000-0000-4000-8000-00000000000f';
const ACTOR_ID = '00000000-0000-4000-8000-000000000001';
const TARGET_ID = '00000000-0000-4000-8000-000000000002';

function actor(
  roles: string[] = ['SUPER_ADMIN'],
  permissions: string[] = ['user.manage'],
): AuthenticatedActor {
  return {
    staffProfileId: ACTOR_ID,
    authUserId: '00000000-0000-4000-8000-000000000003',
    fullName: 'Owner',
    email: 'owner@example.com',
    roles,
    permissions,
  };
}

function prismaMock(targetStatus = 'ACTIVE') {
  const staffProfile = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ status: targetStatus }),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: TARGET_ID, email: 'new.staff@example.com', fullName: 'New Staff', status: 'INVITED' }),
    update: jest.fn().mockResolvedValue({ id: TARGET_ID, status: 'SUSPENDED' }),
    count: jest.fn().mockResolvedValue(0),
  };
  const staffRoleAssignment = {
    count: jest.fn().mockResolvedValue(1),
    findFirst: jest.fn().mockResolvedValue(null),
  };
  const auditLog = { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const tx = { staffProfile, staffRoleAssignment, auditLog };
  return {
    staffProfile,
    staffRoleAssignment,
    auditLog,
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : [[], 0],
    ),
  };
}

describe('StaffManagementService authorization', () => {
  it('requires both the Super Admin role and user.manage', async () => {
    const cases: Array<[string[], string[]]> = [
      [['MANAGER'], ['user.manage']],
      [['SUPER_ADMIN'], ['report.read']],
      [['RECEPTION'], []],
    ];

    for (const [roles, permissions] of cases) {
      const service = new StaffManagementService(prismaMock() as never, supabaseAdminMock() as never);
      await expect(
        service.list(actor(roles, permissions), { page: 1, pageSize: 50 }),
      ).rejects.toThrow(ForbiddenException);
      await expect(service.detail(actor(roles, permissions), TARGET_ID)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(
        service.changeStatus(actor(roles, permissions), TARGET_ID, 'SUSPENDED', undefined, CORRELATION_ID),
      ).rejects.toThrow(ForbiddenException);
    }
  });
});

describe('StaffManagementService.invite', () => {
  it('invites via Supabase Admin API, creates an INVITED profile and audits it', async () => {
    const prisma = prismaMock();
    const supabaseAdmin = supabaseAdminMock();
    const service = new StaffManagementService(prisma as never, supabaseAdmin as never);

    const result = await service.invite(actor(), { email: ' New.Staff@Example.com ', fullName: ' New Staff ' }, CORRELATION_ID);

    expect(supabaseAdmin.inviteUserByEmail).toHaveBeenCalledWith('new.staff@example.com');
    expect(prisma.staffProfile.create).toHaveBeenCalledWith({
      data: { authUserId: '00000000-0000-4000-8000-000000000099', fullName: 'New Staff', email: 'new.staff@example.com', status: 'INVITED' },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'staff.invited', correlationId: CORRELATION_ID }) }),
    );
    expect(result).toEqual({ id: TARGET_ID, email: 'new.staff@example.com', fullName: 'New Staff', status: 'INVITED' });
  });

  it('rejects when a staff profile with that email already exists', async () => {
    const prisma = prismaMock();
    prisma.staffProfile.findFirst.mockResolvedValue({ id: 'existing' });
    const supabaseAdmin = supabaseAdminMock();
    const service = new StaffManagementService(prisma as never, supabaseAdmin as never);

    await expect(service.invite(actor(), { email: 'dup@example.com', fullName: 'Dup' }, CORRELATION_ID)).rejects.toThrow(ConflictException);
    expect(supabaseAdmin.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('requires both the Super Admin role and user.manage', async () => {
    const prisma = prismaMock();
    const service = new StaffManagementService(prisma as never, supabaseAdminMock() as never);
    await expect(
      service.invite(actor(['MANAGER'], ['user.manage']), { email: 'x@example.com', fullName: 'X' }, CORRELATION_ID),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('StaffManagementService.list', () => {
  it('flattens role codes onto each staff row', async () => {
    const prisma = prismaMock();
    prisma.$transaction = jest.fn().mockResolvedValue([
      [
        {
          id: TARGET_ID,
          fullName: 'Lễ tân A',
          email: 'reception@example.com',
          status: 'ACTIVE',
          lastLoginAt: null,
          createdAt: new Date(),
          roleAssignments: [{ role: { code: 'RECEPTION', name: 'Reception' } }],
        },
      ],
      1,
    ]);
    const service = new StaffManagementService(prisma as never, supabaseAdminMock() as never);

    const result = await service.list(actor(), { page: 1, pageSize: 50 });

    expect(result.items[0]?.roles).toEqual(['RECEPTION']);
  });

  it('rejects an unknown status filter', async () => {
    const service = new StaffManagementService(prismaMock() as never, supabaseAdminMock() as never);
    await expect(
      service.list(actor(), { status: 'DELETED', page: 1, pageSize: 50 }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('StaffManagementService.detail', () => {
  it('returns 404 for an unknown staff member', async () => {
    const prisma = prismaMock();
    prisma.staffProfile.findUnique.mockResolvedValue(null);
    const service = new StaffManagementService(prisma as never, supabaseAdminMock() as never);

    await expect(service.detail(actor(), TARGET_ID)).rejects.toThrow(NotFoundException);
  });
});

describe('StaffManagementService.changeStatus', () => {
  it('suspends a staff member and audits it', async () => {
    const prisma = prismaMock();
    const service = new StaffManagementService(prisma as never, supabaseAdminMock() as never);

    await service.changeStatus(actor(), TARGET_ID, 'SUSPENDED', 'Nghỉ việc', CORRELATION_ID);

    expect(prisma.staffProfile.update).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'STAFF',
        actorId: ACTOR_ID,
        action: 'staff.status.changed',
        resourceType: 'staff_profile',
        resourceId: TARGET_ID,
        beforeData: { status: 'ACTIVE' },
        afterData: { status: 'SUSPENDED' },
        reason: 'Nghỉ việc',
        correlationId: CORRELATION_ID,
      }),
    });
  });

  it('refuses a self status change', async () => {
    const service = new StaffManagementService(prismaMock() as never, supabaseAdminMock() as never);
    await expect(
      service.changeStatus(actor(), ACTOR_ID, 'SUSPENDED', undefined, CORRELATION_ID),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects an unknown status', async () => {
    const service = new StaffManagementService(prismaMock() as never, supabaseAdminMock() as never);
    await expect(
      service.changeStatus(actor(), TARGET_ID, 'DELETED', undefined, CORRELATION_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses to suspend the last active Super Admin', async () => {
    const prisma = prismaMock('ACTIVE');
    prisma.staffRoleAssignment.count.mockResolvedValue(0);
    prisma.staffRoleAssignment.findFirst.mockResolvedValue({ staffId: TARGET_ID });
    const service = new StaffManagementService(prisma as never, supabaseAdminMock() as never);

    await expect(
      service.changeStatus(actor(), TARGET_ID, 'SUSPENDED', undefined, CORRELATION_ID),
    ).rejects.toThrow(ConflictException);
  });

  it('allows suspending a Super Admin while another active one remains', async () => {
    const prisma = prismaMock('ACTIVE');
    prisma.staffRoleAssignment.count.mockResolvedValue(1);
    prisma.staffRoleAssignment.findFirst.mockResolvedValue({ staffId: TARGET_ID });
    const service = new StaffManagementService(prisma as never, supabaseAdminMock() as never);

    await expect(
      service.changeStatus(actor(), TARGET_ID, 'SUSPENDED', undefined, CORRELATION_ID),
    ).resolves.toBeDefined();
  });

  it('does not run the last-Super-Admin check when activating', async () => {
    const prisma = prismaMock('SUSPENDED');
    const service = new StaffManagementService(prisma as never, supabaseAdminMock() as never);

    await service.changeStatus(actor(), TARGET_ID, 'ACTIVE', undefined, CORRELATION_ID);

    expect(prisma.staffRoleAssignment.count).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown staff member', async () => {
    const prisma = prismaMock();
    prisma.staffProfile.findUnique.mockResolvedValue(null);
    const service = new StaffManagementService(prisma as never, supabaseAdminMock() as never);

    await expect(
      service.changeStatus(actor(), TARGET_ID, 'SUSPENDED', undefined, CORRELATION_ID),
    ).rejects.toThrow(NotFoundException);
  });
});
