import { Test } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: { auditLog: { create: jest.Mock; findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AuditService);
  });

  it('creates an audit log entry', async () => {
    await service.log({
      actorType: 'staff',
      actorId: 'staff-1',
      action: 'booking.confirm',
      resourceType: 'booking',
      resourceId: 'booking-1',
      reason: 'Payment received',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'staff',
        actorId: 'staff-1',
        action: 'booking.confirm',
        resourceType: 'booking',
        resourceId: 'booking-1',
        reason: 'Payment received',
      }),
    });
  });

  it('logs before and after data', async () => {
    await service.log({
      actorType: 'staff',
      actorId: 'staff-1',
      action: 'booking.update',
      resourceType: 'booking',
      resourceId: 'booking-1',
      beforeData: { status: 'PENDING_PAYMENT' },
      afterData: { status: 'CONFIRMED' },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        beforeData: { status: 'PENDING_PAYMENT' },
        afterData: { status: 'CONFIRMED' },
      }),
    });
  });

  it('finds audit logs by resource', async () => {
    await service.findByResource('booking', 'booking-1');

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { resourceType: 'booking', resourceId: 'booking-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('finds audit logs by actor with default limit', async () => {
    await service.findByActor('staff-1');

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { actorId: 'staff-1' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  });

  it('finds audit logs by actor with custom limit', async () => {
    await service.findByActor('staff-1', 10);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { actorId: 'staff-1' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  });
});
