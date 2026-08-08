import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateCustomerDto } from './dto/create-customer.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const phoneNormalized = dto.phone
      ? CustomersService.normalizePhone(dto.phone)
      : null;
    const emailNormalized = dto.email ? dto.email.toLowerCase().trim() : null;

    const customer = await this.prisma.customer.create({
      data: {
        customerCode: CustomersService.generateCode(),
        fullName: dto.fullName.trim(),
        phoneNormalized,
        emailNormalized,
        source: dto.source ?? 'DIRECT',
        marketingConsent: dto.marketingConsent ?? false,
        privacyConsentAt: dto.marketingConsent ? new Date() : null,
        notes: dto.notes ?? null,
      },
    });

    await this.prisma.outboxEvent.create({
      data: {
        aggregateType: 'customer',
        aggregateId: customer.id,
        eventType: 'customer.created',
        payload: {
          customerId: customer.id,
          customerCode: customer.customerCode,
        },
      },
    });

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const data: Record<string, unknown> = {};

    if (dto.fullName !== undefined) data['fullName'] = dto.fullName.trim();
    if (dto.phone !== undefined)
      data['phoneNormalized'] = dto.phone
        ? CustomersService.normalizePhone(dto.phone)
        : null;
    if (dto.email !== undefined)
      data['emailNormalized'] = dto.email
        ? dto.email.toLowerCase().trim()
        : null;
    if (dto.source !== undefined) data['source'] = dto.source;
    if (dto.marketingConsent !== undefined) {
      data['marketingConsent'] = dto.marketingConsent;
      if (dto.marketingConsent) data['privacyConsentAt'] = new Date();
    }
    if (dto.notes !== undefined) data['notes'] = dto.notes;

    return this.prisma.customer.update({ where: { id }, data });
  }

  async findById(id: string) {
    return this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async softDelete(id: string) {
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findDuplicates(phone?: string | null, email?: string | null) {
    const conditions: Record<string, unknown>[] = [];

    if (phone) {
      const normalized = CustomersService.normalizePhone(phone);
      if (normalized) {
        conditions.push({ phoneNormalized: normalized });
      }
    }

    if (email) {
      conditions.push({ emailNormalized: email.toLowerCase().trim() });
    }

    if (conditions.length === 0) return [];

    return this.prisma.customer.findMany({
      where: {
        deletedAt: null,
        OR: conditions,
      },
    });
  }

  async findOrCreate(dto: CreateCustomerDto) {
    const duplicates = await this.findDuplicates(dto.phone, dto.email);
    if (duplicates.length > 0) return { customer: duplicates[0]!, created: false };

    const customer = await this.create(dto);
    return { customer, created: true };
  }

  static normalizePhone(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;

    if (digits.startsWith('84') && digits.length >= 11 && digits.length <= 12) {
      return `+${digits}`;
    }

    if (digits.startsWith('0') && digits.length >= 10 && digits.length <= 11) {
      return `+84${digits.slice(1)}`;
    }

    return `+${digits}`;
  }

  static generateCode(): string {
    const hex = randomBytes(5).toString('hex').toUpperCase();
    return `VMD-${hex}`;
  }
}
