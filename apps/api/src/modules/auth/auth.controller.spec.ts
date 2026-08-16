import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const controller = new AuthController();

  it('returns staff profile from getMe', () => {
    const staff = {
      id: 'staff-1',
      email: 'admin@vuonmangden.vn',
      fullName: 'Admin User',
      role: 'super_admin',
    };

    const result = controller.getMe(staff);

    expect(result).toEqual({
      id: 'staff-1',
      email: 'admin@vuonmangden.vn',
      fullName: 'Admin User',
      role: 'super_admin',
    });
  });

  it('excludes extra fields from response', () => {
    const staff = {
      id: 'staff-1',
      authUserId: 'auth-1',
      email: 'admin@vuonmangden.vn',
      fullName: 'Admin User',
      role: 'manager',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = controller.getMe(staff);

    expect(result).toEqual({
      id: 'staff-1',
      email: 'admin@vuonmangden.vn',
      fullName: 'Admin User',
      role: 'manager',
    });
    expect(result).not.toHaveProperty('authUserId');
    expect(result).not.toHaveProperty('isActive');
  });
});
