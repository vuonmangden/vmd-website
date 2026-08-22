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
          bbqReservationId: true,
          provider: true,
          status: true,
          amount: true,
          paidAmount: true,
          currency: true,
          transferContent: true,
          expiresAt: true,
          createdAt: true,
          booking: { select: { bookingCode: true, customer: { select: { fullName: true } } } },
          bbqReservation: { select: { reservationCode: true, customer: { select: { fullName: true } } } },
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
        bbqReservationId: true,
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
        bbqReservation: {
          select: { id: true, reservationCode: true, status: true, customer: { select: { id: true, fullName: true } } },
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
  bookingId: string | null;
  bbqReservationId: string | null;
  provider: string;
  status: string;
  amount: bigint;
  paidAmount: bigint;
  currency: string;
  transferContent: string;
  expiresAt: Date;
  createdAt: Date;
  booking: { bookingCode: string; customer: { fullName: string } } | null;
  bbqReservation: { reservationCode: string; customer: { fullName: string } } | null;
  reconciliationCases: { id: string; reason: string }[];
}) {
  const reference = row.booking
    ? { referenceType: 'BOOKING' as const, referenceCode: row.booking.bookingCode, customerName: row.booking.customer.fullName }
    : { referenceType: 'BBQ_RESERVATION' as const, referenceCode: row.bbqReservation!.reservationCode, customerName: row.bbqReservation!.customer.fullName };
  return {
    id: row.id,
    bookingId: row.bookingId,
    bbqReservationId: row.bbqReservationId,
    referenceType: reference.referenceType,
    referenceCode: reference.referenceCode,
    customerName: reference.customerName,
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
