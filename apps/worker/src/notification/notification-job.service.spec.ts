import { Prisma } from '@prisma/client';
import { NotificationJobService } from './notification-job.service';

function prismaMock() {
  return {
    booking: { findUnique: jest.fn() },
    bbqReservation: { findUnique: jest.fn() },
    paymentIntent: { findUnique: jest.fn().mockResolvedValue({ paidAmount: 500_000n }) },
    notificationJob: { create: jest.fn().mockResolvedValue({}) },
  };
}

const BOOKING = {
  bookingCode: 'VMD-1',
  checkInDate: new Date('2026-09-01T00:00:00.000Z'),
  checkOutDate: new Date('2026-09-03T00:00:00.000Z'),
  adults: 2,
  children: 0,
  totalAmount: 1_200_000n,
  customer: { fullName: 'Nguyễn Văn A', emailNormalized: 'a@example.test', phoneNormalized: '0987654321' },
  rooms: [{ roomType: { name: 'Double Lake Window' } }],
};

const BBQ = {
  reservationCode: 'BBQ-1',
  reservationDate: new Date('2026-09-01T00:00:00.000Z'),
  startTime: '18:00',
  endTime: '20:00',
  adults: 4,
  children: 0,
  customer: { fullName: 'Trần Thị B', emailNormalized: 'b@example.test', phoneNormalized: '0912345678' },
  tables: [{ area: { name: 'Khu vườn thông trước' } }],
};

describe('NotificationJobService.enqueueBookingConfirmed', () => {
  it('creates one email job and one Zalo job with the documented deduplication keys', async () => {
    const prisma = prismaMock();
    prisma.booking.findUnique.mockResolvedValue(BOOKING);
    const service = new NotificationJobService(prisma as never);

    await service.enqueueBookingConfirmed('booking-1', 'intent-1');

    expect(prisma.notificationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ templateCode: 'BOOKING_CONFIRMED_EMAIL', deduplicationKey: 'booking:booking-1:confirmed:email', email: 'a@example.test', phone: null }) }),
    );
    expect(prisma.notificationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ templateCode: 'BOOKING_CONFIRMED_ZALO', deduplicationKey: 'booking:booking-1:confirmed:zalo', phone: '0987654321', email: null }) }),
    );
  });

  it('skips the email job when the customer has no email on file', async () => {
    const prisma = prismaMock();
    prisma.booking.findUnique.mockResolvedValue({ ...BOOKING, customer: { ...BOOKING.customer, emailNormalized: null } });
    const service = new NotificationJobService(prisma as never);

    await service.enqueueBookingConfirmed('booking-1', 'intent-1');

    const templateCodes = prisma.notificationJob.create.mock.calls.map((call) => call[0].data.templateCode);
    expect(templateCodes).toEqual(['BOOKING_CONFIRMED_ZALO']);
  });

  it('does nothing when the booking cannot be found', async () => {
    const prisma = prismaMock();
    prisma.booking.findUnique.mockResolvedValue(null);
    const service = new NotificationJobService(prisma as never);

    await expect(service.enqueueBookingConfirmed('missing', 'intent-1')).resolves.toBeUndefined();
    expect(prisma.notificationJob.create).not.toHaveBeenCalled();
  });

  it('swallows a duplicate-key conflict instead of throwing, since it means the job already exists', async () => {
    const prisma = prismaMock();
    prisma.booking.findUnique.mockResolvedValue(BOOKING);
    prisma.notificationJob.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '7.7.0' }),
    );
    const service = new NotificationJobService(prisma as never);

    await expect(service.enqueueBookingConfirmed('booking-1', 'intent-1')).resolves.toBeUndefined();
  });
});

describe('NotificationJobService.enqueueBbqConfirmed', () => {
  it('creates jobs using the first assigned table\'s area name', async () => {
    const prisma = prismaMock();
    prisma.bbqReservation.findUnique.mockResolvedValue(BBQ);
    const service = new NotificationJobService(prisma as never);

    await service.enqueueBbqConfirmed('reservation-1', 'intent-1');

    expect(prisma.notificationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateCode: 'BBQ_CONFIRMED_EMAIL',
          deduplicationKey: 'bbq_reservation:reservation-1:confirmed:email',
        }),
      }),
    );
  });
});

describe('NotificationJobService.enqueuePaymentException', () => {
  const ORIGINAL_ENV = process.env['NOTIFICATION_INTERNAL_EMAIL'];
  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env['NOTIFICATION_INTERNAL_EMAIL'];
    else process.env['NOTIFICATION_INTERNAL_EMAIL'] = ORIGINAL_ENV;
  });

  it('skips silently when NOTIFICATION_INTERNAL_EMAIL is not configured', async () => {
    delete process.env['NOTIFICATION_INTERNAL_EMAIL'];
    const prisma = prismaMock();
    const service = new NotificationJobService(prisma as never);

    await service.enqueuePaymentException({
      paymentIntentId: 'intent-1',
      bookingId: 'booking-1',
      bbqReservationId: null,
      reason: 'UNDERPAYMENT',
      expectedAmount: '1200000',
      receivedAmount: '1000000',
    });

    expect(prisma.notificationJob.create).not.toHaveBeenCalled();
  });

  it('resolves the human-readable booking code and creates a staff-only email job', async () => {
    process.env['NOTIFICATION_INTERNAL_EMAIL'] = 'ops@example.test';
    const prisma = prismaMock();
    prisma.booking.findUnique.mockResolvedValue({ bookingCode: 'VMD-1' });
    const service = new NotificationJobService(prisma as never);

    await service.enqueuePaymentException({
      paymentIntentId: 'intent-1',
      bookingId: 'booking-1',
      bbqReservationId: null,
      reason: 'UNDERPAYMENT',
      expectedAmount: '1200000',
      receivedAmount: '1000000',
    });

    expect(prisma.notificationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateCode: 'PAYMENT_EXCEPTION_INTERNAL',
          deduplicationKey: 'payment_intent:intent-1:exception:UNDERPAYMENT',
          email: 'ops@example.test',
          phone: null,
        }),
      }),
    );
    const body = prisma.notificationJob.create.mock.calls[0][0].data.payload.body as string;
    expect(body).toContain('VMD-1');
  });
});

describe('NotificationJobService.enqueueBookingReminder', () => {
  const SEND_AT = new Date('2026-08-25T03:00:00.000Z');

  it('keys the dedup on the check-in date, so a reschedule earns a fresh job instead of colliding', async () => {
    const prisma = prismaMock();
    prisma.booking.findUnique.mockResolvedValue(BOOKING);
    const service = new NotificationJobService(prisma as never);

    await service.enqueueBookingReminder('booking-1', 7, SEND_AT);

    expect(prisma.notificationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateCode: 'BOOKING_REMINDER_T7_EMAIL',
          deduplicationKey: 'booking:booking-1:reminder:t7:2026-09-01:email',
          scheduledAt: SEND_AT,
          payload: expect.objectContaining({ targetCheckInDate: '2026-09-01' }),
        }),
      }),
    );
  });

  it('schedules for the given send time rather than immediately', async () => {
    const prisma = prismaMock();
    prisma.booking.findUnique.mockResolvedValue(BOOKING);
    const service = new NotificationJobService(prisma as never);

    await service.enqueueBookingReminder('booking-1', 1, SEND_AT);

    for (const call of prisma.notificationJob.create.mock.calls) {
      expect(call[0].data.scheduledAt).toBe(SEND_AT);
    }
  });
});
