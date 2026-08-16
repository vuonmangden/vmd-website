import { Test } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: { staffMember: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      staffMember: {
        findUnique: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(StaffService);
  });

  it('finds staff by auth user id', async () => {
    const staff = { id: 'staff-1', authUserId: 'auth-1', email: 'a@b.com' };
    prisma.staffMember.findUnique.mockResolvedValue(staff);

    const result = await service.findByAuthUserId('auth-1');

    expect(result).toEqual(staff);
    expect(prisma.staffMember.findUnique).toHaveBeenCalledWith({
      where: { authUserId: 'auth-1' },
    });
  });

  it('returns null when staff not found', async () => {
    prisma.staffMember.findUnique.mockResolvedValue(null);

    const result = await service.findByAuthUserId('nonexistent');

    expect(result).toBeNull();
  });

  it('finds active staff only', async () => {
    const staff = { id: 'staff-1', authUserId: 'auth-1', isActive: true };
    prisma.staffMember.findUnique.mockResolvedValue(staff);

    const result = await service.findActiveByAuthUserId('auth-1');

    expect(result).toEqual(staff);
    expect(prisma.staffMember.findUnique).toHaveBeenCalledWith({
      where: { authUserId: 'auth-1', isActive: true },
    });
  });
});
