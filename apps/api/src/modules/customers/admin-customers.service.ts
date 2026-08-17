import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from '../auth/auth.types';

/**
 * Roles allowed to see a customer's unmasked contact details. Everyone else
 * with booking.read sees the masked listing only — §35.5 keeps full PII behind
 * a narrower gate than booking data itself.
 */
const FULL_PII_ROLES: readonly string[] = ['SUPER_ADMIN', 'MANAGER', 'RECEPTION'];

export interface ListCustomersOptions {
  search?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class AdminCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(options: ListCustomersOptions) {
    const where: Record<string, unknown> = { deletedAt: null };

    if (options.search) {
      const term = options.search.trim();
      where['OR'] = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { customerCode: { contains: term, mode: 'insensitive' } },
        { phoneNormalized: { contains: term } },
        { emailNormalized: { contains: term } },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        select: {
          id: true,
          customerCode: true,
          fullName: true,
          phoneNormalized: true,
          emailNormalized: true,
          source: true,
          firstBookingAt: true,
          lastBookingAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        customerCode: row.customerCode,
        fullName: row.fullName,
        phoneMasked: maskPhone(row.phoneNormalized),
        emailMasked: maskEmail(row.emailNormalized),
        source: row.source,
        firstBookingAt: row.firstBookingAt,
        lastBookingAt: row.lastBookingAt,
        createdAt: row.createdAt,
      })),
      page: options.page,
      pageSize: options.pageSize,
      total,
    };
  }

  /**
   * Full record including booking history. Reading unmasked contact details is
   * a privileged action, so it is audited even though nothing is modified —
   * §12 requires an audit trail for access to customer PII.
   */
  async detail(actor: AuthenticatedActor, customerId: string, correlationId: string) {
    if (!actor.roles.some((role) => FULL_PII_ROLES.includes(role))) {
      throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Permission denied' });
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: {
        id: true,
        customerCode: true,
        fullName: true,
        phoneNormalized: true,
        emailNormalized: true,
        source: true,
        marketingConsent: true,
        privacyConsentAt: true,
        notes: true,
        firstBookingAt: true,
        lastBookingAt: true,
        createdAt: true,
        bookings: {
          select: {
            id: true,
            bookingCode: true,
            status: true,
            checkInDate: true,
            checkOutDate: true,
            totalAmount: true,
            currency: true,
          },
          orderBy: { checkInDate: 'desc' },
          take: 50,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
    }

    await this.prisma.auditLog.create({
      data: {
        actorType: 'STAFF',
        actorId: actor.staffProfileId,
        action: 'customer.pii.viewed',
        resourceType: 'customer',
        resourceId: customerId,
        correlationId,
      },
    });

    return {
      ...customer,
      bookings: customer.bookings.map((booking) => ({
        ...booking,
        totalAmount: booking.totalAmount.toString(),
      })),
    };
  }
}

export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain || !local) return '***';
  return `${local.slice(0, Math.min(3, local.length))}***@${domain}`;
}

export function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.length <= 4 ? '****' : `****${phone.slice(-4)}`;
}
