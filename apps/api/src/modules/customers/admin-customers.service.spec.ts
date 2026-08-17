import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminCustomersService, maskEmail, maskPhone } from './admin-customers.service';
import type { AuthenticatedActor } from '../auth/auth.types';

const CORRELATION_ID = '00000000-0000-4000-8000-00000000000d';

function actor(roles: string[]): AuthenticatedActor {
  return {
    staffProfileId: '00000000-0000-4000-8000-000000000001',
    authUserId: '00000000-0000-4000-8000-000000000002',
    fullName: 'Test Staff',
    email: 'staff@example.com',
    roles,
    permissions: ['booking.read'],
  };
}

const CUSTOMER_ROW = {
  id: 'customer-1',
  customerCode: 'VMD-0001',
  fullName: 'Nguyễn Văn A',
  phoneNormalized: '+84901234567',
  emailNormalized: 'guest@example.com',
  source: 'WEBSITE',
  firstBookingAt: null,
  lastBookingAt: null,
  createdAt: new Date('2026-08-16T00:00:00Z'),
};

function prismaMock() {
  const customer = {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue({ ...CUSTOMER_ROW, bookings: [] }),
    count: jest.fn().mockResolvedValue(0),
  };
  const auditLog = { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  return {
    customer,
    auditLog,
    $transaction: jest.fn().mockResolvedValue([[], 0]),
  };
}

describe('AdminCustomersService.list', () => {
  it('excludes soft-deleted customers', async () => {
    const prisma = prismaMock();
    const service = new AdminCustomersService(prisma as never);

    await service.list({ page: 1, pageSize: 50 });

    expect(prisma.customer.findMany.mock.calls[0][0].where.deletedAt).toBeNull();
  });

  it('searches name, code, phone and email', async () => {
    const prisma = prismaMock();
    const service = new AdminCustomersService(prisma as never);

    await service.list({ search: 'Nguyễn', page: 1, pageSize: 50 });

    const or = prisma.customer.findMany.mock.calls[0][0].where.OR;
    expect(or).toHaveLength(4);
  });

  it('masks contact details in the listing', async () => {
    const prisma = prismaMock();
    prisma.$transaction = jest.fn().mockResolvedValue([[CUSTOMER_ROW], 1]);
    const service = new AdminCustomersService(prisma as never);

    const result = await service.list({ page: 1, pageSize: 50 });

    expect(result.items[0]?.emailMasked).toBe('gue***@example.com');
    expect(result.items[0]?.phoneMasked).toBe('****4567');
    expect(JSON.stringify(result)).not.toContain('guest@example.com');
    expect(JSON.stringify(result)).not.toContain('+84901234567');
  });

  it('paginates', async () => {
    const prisma = prismaMock();
    const service = new AdminCustomersService(prisma as never);

    await service.list({ page: 3, pageSize: 20 });

    expect(prisma.customer.findMany.mock.calls[0][0].skip).toBe(40);
    expect(prisma.customer.findMany.mock.calls[0][0].take).toBe(20);
  });
});

describe('AdminCustomersService.detail', () => {
  it('allows Super Admin, Manager and Reception', async () => {
    for (const role of ['SUPER_ADMIN', 'MANAGER', 'RECEPTION']) {
      const service = new AdminCustomersService(prismaMock() as never);
      await expect(
        service.detail(actor([role]), 'customer-1', CORRELATION_ID),
      ).resolves.toBeDefined();
    }
  });

  it('denies Accountant and Marketing full contact details', async () => {
    for (const role of ['ACCOUNTANT', 'MARKETING']) {
      const service = new AdminCustomersService(prismaMock() as never);
      await expect(
        service.detail(actor([role]), 'customer-1', CORRELATION_ID),
      ).rejects.toThrow(ForbiddenException);
    }
  });

  it('audits the PII access even though nothing changes', async () => {
    const prisma = prismaMock();
    const service = new AdminCustomersService(prisma as never);

    await service.detail(actor(['MANAGER']), 'customer-1', CORRELATION_ID);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'STAFF',
        actorId: '00000000-0000-4000-8000-000000000001',
        action: 'customer.pii.viewed',
        resourceType: 'customer',
        resourceId: 'customer-1',
        correlationId: CORRELATION_ID,
      }),
    });
  });

  it('does not audit when access was denied', async () => {
    const prisma = prismaMock();
    const service = new AdminCustomersService(prisma as never);

    await expect(
      service.detail(actor(['ACCOUNTANT']), 'customer-1', CORRELATION_ID),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('returns 404 for a soft-deleted or unknown customer', async () => {
    const prisma = prismaMock();
    prisma.customer.findFirst.mockResolvedValue(null);
    const service = new AdminCustomersService(prisma as never);

    await expect(
      service.detail(actor(['MANAGER']), 'missing', CORRELATION_ID),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.customer.findFirst.mock.calls[0][0].where.deletedAt).toBeNull();
  });

  it('serialises booking totals as integer strings', async () => {
    const prisma = prismaMock();
    prisma.customer.findFirst.mockResolvedValue({
      ...CUSTOMER_ROW,
      bookings: [{ id: 'booking-1', bookingCode: 'VMD-1', totalAmount: 2_400_000n, currency: 'VND' }],
    });
    const service = new AdminCustomersService(prisma as never);

    const result = await service.detail(actor(['MANAGER']), 'customer-1', CORRELATION_ID);

    expect(result.bookings[0]?.totalAmount).toBe('2400000');
  });
});

describe('masking helpers', () => {
  it('masks emails and phones, passing through nulls', () => {
    expect(maskEmail('guest@example.com')).toBe('gue***@example.com');
    expect(maskEmail(null)).toBeNull();
    expect(maskPhone('+84901234567')).toBe('****4567');
    expect(maskPhone('123')).toBe('****');
    expect(maskPhone(null)).toBeNull();
  });
});
