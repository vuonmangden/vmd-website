import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from './auth.types';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let tx: ReturnType<typeof transactionClient>;
  let service: RolesService;

  beforeEach(() => {
    tx = transactionClient();
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
    service = new RolesService(prisma as unknown as PrismaService);
  });

  it('denies role management without trusted SUPER_ADMIN and user.manage', async () => {
    await expect(service.assignRole(actor(['MANAGER'], ['user.manage']), targetId, 'MANAGER', correlationId))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies self role changes to prevent privilege escalation', async () => {
    const admin = actor(['SUPER_ADMIN'], ['user.manage']);
    await expect(service.assignRole(admin, admin.staffProfileId, 'ACCOUNTANT', correlationId))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assigns an approved system role and writes immutable audit context in one transaction', async () => {
    tx.role.findUnique.mockResolvedValue({ id: roleId, code: 'MANAGER', isSystem: true });
    tx.staffProfile.findUnique.mockResolvedValue({ id: targetId });
    await service.assignRole(actor(['SUPER_ADMIN'], ['user.manage']), targetId, 'MANAGER', correlationId);
    expect(tx.staffRoleAssignment.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { staffId_roleId: { staffId: targetId, roleId } },
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'staff.role.assign', resourceId: targetId, correlationId,
    }) });
  });

  it('cannot revoke the final SUPER_ADMIN assignment', async () => {
    tx.role.findUnique.mockResolvedValue({ id: roleId, code: 'SUPER_ADMIN', isSystem: true });
    tx.staffRoleAssignment.findUnique.mockResolvedValue({ staffId: targetId });
    tx.staffRoleAssignment.count.mockResolvedValue(1);
    await expect(service.revokeRole(actor(['SUPER_ADMIN'], ['user.manage']), targetId, 'SUPER_ADMIN', correlationId))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.staffRoleAssignment.delete).not.toHaveBeenCalled();
  });
});

const targetId = '00000000-0000-4000-8000-000000000010';
const roleId = '00000000-0000-4000-8000-000000000020';
const correlationId = '00000000-0000-4000-8000-000000000030';

function actor(roles: string[], permissions: string[]): AuthenticatedActor {
  return {
    staffProfileId: '00000000-0000-4000-8000-000000000001',
    authUserId: '00000000-0000-4000-8000-000000000002',
    fullName: 'Super Admin Test', email: 'admin@example.test', roles, permissions,
  };
}

function transactionClient() {
  return {
    role: { findUnique: jest.fn() },
    staffProfile: { findUnique: jest.fn() },
    staffRoleAssignment: {
      upsert: jest.fn(), findUnique: jest.fn(), count: jest.fn(), delete: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
}
