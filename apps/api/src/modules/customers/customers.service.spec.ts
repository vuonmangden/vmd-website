import { Test } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: {
    $transaction: jest.Mock;
    customer: {
      create: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    outboxEvent: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      customer: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      outboxEvent: { create: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CustomersService);
  });

  describe('create', () => {
    it('creates a customer with normalized phone and email', async () => {
      const mockCustomer = {
        id: '00000000-0000-0000-0000-000000000001',
        customerCode: 'VMD-ABC123',
        fullName: 'Nguyen Van A',
        phoneNormalized: '+84912345678',
        emailNormalized: 'test@example.com',
      };
      prisma.customer.create.mockResolvedValue(mockCustomer);
      prisma.outboxEvent.create.mockResolvedValue({});

      const result = await service.create({
        fullName: ' Nguyen Van A ',
        phone: '0912345678',
        email: 'Test@Example.COM',
      });

      expect(result).toEqual(mockCustomer);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fullName: 'Nguyen Van A',
          phoneNormalized: '+84912345678',
          emailNormalized: 'test@example.com',
          source: 'DIRECT',
          marketingConsent: false,
        }),
      });
    });

    it('rolls back customer creation when the outbox write fails', async () => {
      prisma.customer.create.mockResolvedValue({ id: 'cust-id', customerCode: 'VMD-XYZ' });
      prisma.outboxEvent.create.mockRejectedValue(new Error('outbox unavailable'));

      await expect(service.create({ fullName: 'Test' })).rejects.toThrow('outbox unavailable');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('emits customer.created outbox event', async () => {
      const mockCustomer = {
        id: 'cust-id',
        customerCode: 'VMD-XYZ',
      };
      prisma.customer.create.mockResolvedValue(mockCustomer);
      prisma.outboxEvent.create.mockResolvedValue({});

      await service.create({ fullName: 'Test' });

      expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          aggregateType: 'customer',
          aggregateId: 'cust-id',
          eventType: 'customer.created',
          payload: { customerId: 'cust-id', customerCode: 'VMD-XYZ' },
        }),
      });
    });
  });

  describe('normalizePhone', () => {
    it('converts 0xx to +84xx', () => {
      expect(CustomersService.normalizePhone('0912345678')).toBe(
        '+84912345678',
      );
    });

    it('keeps +84 format', () => {
      expect(CustomersService.normalizePhone('+84912345678')).toBe(
        '+84912345678',
      );
    });

    it('handles 84 prefix without +', () => {
      expect(CustomersService.normalizePhone('84912345678')).toBe(
        '+84912345678',
      );
    });

    it('strips non-digit characters', () => {
      expect(CustomersService.normalizePhone('091-234-5678')).toBe(
        '+84912345678',
      );
    });

    it('returns null for empty string', () => {
      expect(CustomersService.normalizePhone('')).toBeNull();
    });
  });

  describe('generateCode', () => {
    it('starts with VMD- prefix', () => {
      const code = CustomersService.generateCode();
      expect(code).toMatch(/^VMD-[0-9A-F]{10}$/);
    });

    it('generates unique codes', () => {
      const codes = new Set(
        Array.from({ length: 100 }, () => CustomersService.generateCode()),
      );
      expect(codes.size).toBe(100);
    });
  });

  describe('findDuplicates', () => {
    it('finds by phone', async () => {
      prisma.customer.findMany.mockResolvedValue([{ id: 'dup' }]);

      const result = await service.findDuplicates('0912345678', null);

      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [{ phoneNormalized: '+84912345678' }],
        },
      });
      expect(result).toHaveLength(1);
    });

    it('finds by email', async () => {
      prisma.customer.findMany.mockResolvedValue([{ id: 'dup' }]);

      const result = await service.findDuplicates(null, 'Test@Email.com');

      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [{ emailNormalized: 'test@email.com' }],
        },
      });
      expect(result).toHaveLength(1);
    });

    it('returns empty when no phone or email', async () => {
      const result = await service.findDuplicates(null, null);
      expect(result).toEqual([]);
      expect(prisma.customer.findMany).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('sets deletedAt', async () => {
      prisma.customer.update.mockResolvedValue({ id: 'x', deletedAt: new Date() });

      await service.softDelete('x');

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'x' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('findOrCreate', () => {
    it('returns existing customer when duplicate found', async () => {
      const existing = { id: 'existing', fullName: 'Old' };
      prisma.customer.findMany.mockResolvedValue([existing]);

      const result = await service.findOrCreate({
        fullName: 'New',
        phone: '0912345678',
      });

      expect(result).toEqual({ customer: existing, created: false });
      expect(prisma.customer.create).not.toHaveBeenCalled();
    });

    it('creates new customer when no duplicate', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      const newCustomer = { id: 'new', customerCode: 'VMD-123' };
      prisma.customer.create.mockResolvedValue(newCustomer);
      prisma.outboxEvent.create.mockResolvedValue({});

      const result = await service.findOrCreate({ fullName: 'New' });

      expect(result.created).toBe(true);
      expect(prisma.customer.create).toHaveBeenCalled();
    });
  });
});
