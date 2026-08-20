import { Injectable, NotFoundException } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

export interface ListPaymentsOptions {
  status?: string;
  bookingId?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class AdminPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(options: ListPaymentsOptions) {
    const where: Record<string, unknown> = {};
    if (options.status) where['status'] = options.status;
    if (options.bookingId) where['bookingId'] = options.bookingId;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.paymentIntent.findMany({
        where,
        select: {
          id: true,
          bookingId: true,
          provider: true,
          status: true,
          amount: true,
          paidAmount: true,
          currency: true,
          transferContent: true,
          expiresAt: true,
          createdAt: true,
          booking: { select: { bookingCode: true, customer: { select: { fullName: true } } } },
          reconciliationCases: { where: { status: 'OPEN' }, select: { id: true, reason: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.paymentIntent.count({ where }),
    ]);

    return {
      items: rows.map(toListItem),
      page: options.page,
      pageSize: options.pageSize,
      total,
    };
  }

  async detail(paymentIntentId: string) {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      select: {
        id: true,
        bookingId: true,
        provider: true,
        status: true,
        amount: true,
        paidAmount: true,
        currency: true,
        transferContent: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        booking: {
          select: { id: true, bookingCode: true, status: true, customer: { select: { id: true, fullName: true } } },
        },
        reconciliationCases: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            reason: true,
            expectedAmount: true,
            receivedAmount: true,
            createdAt: true,
            resolvedAt: true,
            resolvedBy: true,
            resolutionOutcome: true,
            resolutionNote: true,
          },
        },
      },
    });

    if (!intent) {
      throw new NotFoundException({ code: 'PAYMENT_INTENT_NOT_FOUND', message: 'Payment intent not found' });
    }

    return {
      ...intent,
      amount: intent.amount.toString(),
      paidAmount: intent.paidAmount.toString(),
      reconciliationCases: intent.reconciliationCases.map((item) => ({
        ...item,
        expectedAmount: item.expectedAmount.toString(),
        receivedAmount: item.receivedAmount.toString(),
      })),
    };
  }
}

function toListItem(row: {
  id: string;
  bookingId: string;
  provider: string;
  status: string;
  amount: bigint;
  paidAmount: bigint;
  currency: string;
  transferContent: string;
  expiresAt: Date;
  createdAt: Date;
  booking: { bookingCode: string; customer: { fullName: string } };
  reconciliationCases: { id: string; reason: string }[];
}) {
  return {
    id: row.id,
    bookingId: row.bookingId,
    bookingCode: row.booking.bookingCode,
    customerName: row.booking.customer.fullName,
    provider: row.provider,
    status: row.status,
    amount: row.amount.toString(),
    paidAmount: row.paidAmount.toString(),
    currency: row.currency,
    transferContent: row.transferContent,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    openReconciliationCases: row.reconciliationCases,
  };
}
