import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../prisma/prisma.service';
import {
  bbqConfirmedEmail,
  bbqConfirmedZaloParams,
  type BbqConfirmedVars,
} from './templates/bbq-confirmed.template';
import {
  bookingConfirmedEmail,
  bookingConfirmedZaloParams,
  type BookingConfirmedVars,
} from './templates/booking-confirmed.template';
import { paymentExceptionEmail, type PaymentExceptionVars } from './templates/payment-exception.template';

export interface PaymentExceptionPayload {
  paymentIntentId: string;
  bookingId: string | null;
  bbqReservationId: string | null;
  reason: string;
  expectedAmount: string;
  receivedAmount: string;
}

/**
 * Stage A of the notification pipeline: turns a domain event into one
 * `NotificationJob` row per channel (email/Zalo), fully rendered up front so
 * Stage B (`NotificationDispatchService`) only has to send, never re-derive
 * business data. `scheduledAt` is always "now" here — NTF-005's reminder
 * scanner is the only caller that schedules ahead.
 */
@Injectable()
export class NotificationJobService {
  private readonly logger = new Logger(NotificationJobService.name);

  constructor(private readonly prisma: PrismaService) {}

  async enqueueBookingConfirmed(bookingId: string, paymentIntentId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        bookingCode: true,
        checkInDate: true,
        checkOutDate: true,
        adults: true,
        children: true,
        totalAmount: true,
        customer: { select: { fullName: true, emailNormalized: true, phoneNormalized: true } },
        rooms: { select: { roomType: { select: { name: true } } } },
      },
    });
    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found — skipping confirmation notification`);
      return;
    }

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      select: { paidAmount: true },
    });

    const vars: BookingConfirmedVars = {
      guestName: booking.customer.fullName,
      bookingCode: booking.bookingCode,
      roomName: booking.rooms.map((row) => row.roomType.name).join(', ') || 'Vườn Măng Đen',
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      adults: booking.adults,
      children: booking.children,
      depositAmount: intent?.paidAmount ?? 0n,
      totalAmount: booking.totalAmount,
    };

    await this.createEmailJob({
      templateCode: 'BOOKING_CONFIRMED_EMAIL',
      deduplicationKey: `booking:${bookingId}:confirmed:email`,
      recipientType: 'BOOKING',
      recipientReferenceId: bookingId,
      email: booking.customer.emailNormalized,
      ...bookingConfirmedEmail(vars),
    });
    await this.createZaloJob({
      templateCode: 'BOOKING_CONFIRMED_ZALO',
      deduplicationKey: `booking:${bookingId}:confirmed:zalo`,
      recipientType: 'BOOKING',
      recipientReferenceId: bookingId,
      phone: booking.customer.phoneNormalized,
      templateParams: bookingConfirmedZaloParams(vars),
    });
  }

  async enqueueBbqConfirmed(reservationId: string, paymentIntentId: string): Promise<void> {
    const reservation = await this.prisma.bbqReservation.findUnique({
      where: { id: reservationId },
      select: {
        reservationCode: true,
        reservationDate: true,
        startTime: true,
        endTime: true,
        adults: true,
        children: true,
        customer: { select: { fullName: true, emailNormalized: true, phoneNormalized: true } },
        tables: { select: { area: { select: { name: true } } }, take: 1 },
      },
    });
    if (!reservation) {
      this.logger.warn(`BBQ reservation ${reservationId} not found — skipping confirmation notification`);
      return;
    }

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      select: { paidAmount: true },
    });

    const vars: BbqConfirmedVars = {
      guestName: reservation.customer.fullName,
      reservationCode: reservation.reservationCode,
      areaName: reservation.tables[0]?.area.name ?? 'Vườn Măng Đen',
      reservationDate: reservation.reservationDate,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      adults: reservation.adults,
      children: reservation.children,
      depositAmount: intent?.paidAmount ?? 0n,
    };

    await this.createEmailJob({
      templateCode: 'BBQ_CONFIRMED_EMAIL',
      deduplicationKey: `bbq_reservation:${reservationId}:confirmed:email`,
      recipientType: 'BBQ_RESERVATION',
      recipientReferenceId: reservationId,
      email: reservation.customer.emailNormalized,
      ...bbqConfirmedEmail(vars),
    });
    await this.createZaloJob({
      templateCode: 'BBQ_CONFIRMED_ZALO',
      deduplicationKey: `bbq_reservation:${reservationId}:confirmed:zalo`,
      recipientType: 'BBQ_RESERVATION',
      recipientReferenceId: reservationId,
      phone: reservation.customer.phoneNormalized,
      templateParams: bbqConfirmedZaloParams(vars),
    });
  }

  /**
   * Staff-facing only — deliberately never creates a Zalo job (Zalo templates
   * are reviewed by Zalo and can only address a guest with a transaction, not
   * an internal ops alert). Silently no-ops without `NOTIFICATION_INTERNAL_EMAIL`
   * configured, since this alert channel is a Phase 1 convenience, not a
   * dependency the payment webhook itself should ever fail on.
   */
  async enqueuePaymentException(payload: PaymentExceptionPayload): Promise<void> {
    const internalEmail = process.env['NOTIFICATION_INTERNAL_EMAIL']?.trim();
    if (!internalEmail) {
      this.logger.warn('NOTIFICATION_INTERNAL_EMAIL not configured — skipping payment exception alert');
      return;
    }

    const referenceCode = await this.resolveReferenceCode(payload.bookingId, payload.bbqReservationId);
    const vars: PaymentExceptionVars = {
      referenceCode,
      reason: payload.reason,
      expectedAmount: BigInt(payload.expectedAmount),
      receivedAmount: BigInt(payload.receivedAmount),
      occurredAt: new Date(),
    };

    await this.createEmailJob({
      templateCode: 'PAYMENT_EXCEPTION_INTERNAL',
      deduplicationKey: `payment_intent:${payload.paymentIntentId}:exception:${payload.reason}`,
      recipientType: 'STAFF',
      recipientReferenceId: payload.paymentIntentId,
      email: internalEmail,
      ...paymentExceptionEmail(vars),
    });
  }

  private async resolveReferenceCode(bookingId: string | null, bbqReservationId: string | null): Promise<string> {
    if (bookingId) {
      const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, select: { bookingCode: true } });
      if (booking) return booking.bookingCode;
    }
    if (bbqReservationId) {
      const reservation = await this.prisma.bbqReservation.findUnique({ where: { id: bbqReservationId }, select: { reservationCode: true } });
      if (reservation) return reservation.reservationCode;
    }
    return 'N/A';
  }

  private async createEmailJob(input: {
    templateCode: string;
    deduplicationKey: string;
    recipientType: string;
    recipientReferenceId: string;
    email: string | null;
    subject: string;
    body: string;
  }): Promise<void> {
    if (!input.email) {
      this.logger.debug(`No email on file — skipping ${input.templateCode}`);
      return;
    }
    await this.insertJob({
      templateCode: input.templateCode,
      deduplicationKey: input.deduplicationKey,
      recipientType: input.recipientType,
      recipientReferenceId: input.recipientReferenceId,
      email: input.email,
      phone: null,
      payload: { subject: input.subject, body: input.body },
    });
  }

  private async createZaloJob(input: {
    templateCode: string;
    deduplicationKey: string;
    recipientType: string;
    recipientReferenceId: string;
    phone: string | null;
    templateParams: Record<string, string>;
  }): Promise<void> {
    if (!input.phone) {
      this.logger.debug(`No phone on file — skipping ${input.templateCode}`);
      return;
    }
    await this.insertJob({
      templateCode: input.templateCode,
      deduplicationKey: input.deduplicationKey,
      recipientType: input.recipientType,
      recipientReferenceId: input.recipientReferenceId,
      email: null,
      phone: input.phone,
      payload: { templateParams: input.templateParams },
    });
  }

  private async insertJob(data: {
    templateCode: string;
    deduplicationKey: string;
    recipientType: string;
    recipientReferenceId: string;
    email: string | null;
    phone: string | null;
    payload: Prisma.InputJsonValue;
  }): Promise<void> {
    try {
      await this.prisma.notificationJob.create({
        data: {
          templateCode: data.templateCode,
          recipientType: data.recipientType,
          recipientReferenceId: data.recipientReferenceId,
          email: data.email,
          phone: data.phone,
          payload: data.payload,
          scheduledAt: new Date(),
          deduplicationKey: data.deduplicationKey,
        },
      });
    } catch (error) {
      // Same event redelivered (BullMQ at-least-once, or an outbox retry) — the
      // unique deduplication key means the job already exists; nothing to do.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return;
      throw error;
    }
  }
}
