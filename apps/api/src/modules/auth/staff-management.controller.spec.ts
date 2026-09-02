import { StaffManagementController } from './staff-management.controller';

function services() {
  const staff = {
    invite: jest.fn().mockResolvedValue({ id: 'staff-1', email: 'new@example.com', fullName: 'New Staff', status: 'INVITED' }),
    list: jest.fn().mockResolvedValue({ items: [], page: 1, pageSize: 50, total: 0 }),
    detail: jest.fn().mockResolvedValue({ id: 'staff-1' }),
    changeStatus: jest.fn().mockResolvedValue({ id: 'staff-1', status: 'SUSPENDED' }),
  };
  const roles = { assignRole: jest.fn().mockResolvedValue(undefined), revokeRole: jest.fn().mockResolvedValue(undefined) };
  return { staff, roles };
}

function request(headers: Record<string, unknown> = {}) {
  return { actor: { staffProfileId: 'actor-1' }, headers: { 'x-correlation-id': 'corr-1', ...headers } } as never;
}

describe('StaffManagementController.invite', () => {
  it('creates the profile then assigns the starting role, in that order', async () => {
    const { staff, roles } = services();
    const controller = new StaffManagementController(staff as never, roles as never);

    const result = await controller.invite({ email: 'new@example.com', fullName: 'New Staff', roleCode: 'RECEPTION' }, request());

    expect(staff.invite).toHaveBeenCalledWith({ staffProfileId: 'actor-1' }, { email: 'new@example.com', fullName: 'New Staff' }, 'corr-1');
    expect(roles.assignRole).toHaveBeenCalledWith({ staffProfileId: 'actor-1' }, 'staff-1', 'RECEPTION', 'corr-1');
    expect(result).toEqual({ id: 'staff-1', email: 'new@example.com', fullName: 'New Staff', status: 'INVITED' });
  });

  it('propagates a role-assignment failure after the profile was already created', async () => {
    const { staff, roles } = services();
    roles.assignRole.mockRejectedValue(new Error('ROLE_NOT_FOUND'));
    const controller = new StaffManagementController(staff as never, roles as never);

    await expect(controller.invite({ email: 'new@example.com', fullName: 'New Staff', roleCode: 'UNKNOWN' }, request())).rejects.toThrow('ROLE_NOT_FOUND');
    expect(staff.invite).toHaveBeenCalled();
  });
});

describe('StaffManagementController.list', () => {
  it('defaults page and pageSize when the query params are absent', async () => {
    const { staff, roles } = services();
    const controller = new StaffManagementController(staff as never, roles as never);

    await controller.list(request(), undefined, undefined, undefined);

    expect(staff.list).toHaveBeenCalledWith({ staffProfileId: 'actor-1' }, { status: undefined, page: 1, pageSize: 50 });
  });

  it('clamps an out-of-range pageSize back to the default instead of passing it through', async () => {
    const { staff, roles } = services();
    const controller = new StaffManagementController(staff as never, roles as never);

    await controller.list(request(), 'ACTIVE', '3', '500');

    expect(staff.list).toHaveBeenCalledWith({ staffProfileId: 'actor-1' }, { status: 'ACTIVE', page: 3, pageSize: 50 });
  });

  it('trims a blank status filter to undefined', async () => {
    const { staff, roles } = services();
    const controller = new StaffManagementController(staff as never, roles as never);

    await controller.list(request(), '   ', '1', '10');

    expect(staff.list).toHaveBeenCalledWith({ staffProfileId: 'actor-1' }, { status: undefined, page: 1, pageSize: 10 });
  });
});

describe('StaffManagementController.assignRole/revokeRole', () => {
  it('assignRole returns a confirmation after delegating', async () => {
    const { staff, roles } = services();
    const controller = new StaffManagementController(staff as never, roles as never);

    await expect(controller.assignRole('staff-1', { roleCode: 'MANAGER' }, request())).resolves.toEqual({ assigned: true });
    expect(roles.assignRole).toHaveBeenCalledWith({ staffProfileId: 'actor-1' }, 'staff-1', 'MANAGER', 'corr-1');
  });

  it('revokeRole returns a confirmation after delegating', async () => {
    const { staff, roles } = services();
    const controller = new StaffManagementController(staff as never, roles as never);

    await expect(controller.revokeRole('staff-1', 'MANAGER', request())).resolves.toEqual({ revoked: true });
    expect(roles.revokeRole).toHaveBeenCalledWith({ staffProfileId: 'actor-1' }, 'staff-1', 'MANAGER', 'corr-1');
  });
});
