import type { Job } from 'bullmq';
import { NotificationSendProcessor } from './notification-send.processor';

function jobsMock() {
  return {
    enqueueBookingConfirmed: jest.fn().mockResolvedValue(undefined),
    enqueueBbqConfirmed: jest.fn().mockResolvedValue(undefined),
    enqueuePaymentException: jest.fn().mockResolvedValue(undefined),
  };
}

function job(data: Record<string, unknown>): Job {
  return { data } as Job;
}

describe('NotificationSendProcessor', () => {
  it('routes a booking confirmation event to enqueueBookingConfirmed', async () => {
    const jobs = jobsMock();
    const processor = new NotificationSendProcessor(jobs as never);

    await processor.process(job({ eventType: 'booking.confirmed.payment.sandbox', payload: { bookingId: 'booking-1', paymentIntentId: 'intent-1' } }));

    expect(jobs.enqueueBookingConfirmed).toHaveBeenCalledWith('booking-1', 'intent-1');
  });

  it('routes a BBQ confirmation event to enqueueBbqConfirmed', async () => {
    const jobs = jobsMock();
    const processor = new NotificationSendProcessor(jobs as never);

    await processor.process(job({ eventType: 'bbq_reservation.confirmed.payment.sandbox', payload: { reservationId: 'reservation-1', paymentIntentId: 'intent-1' } }));

    expect(jobs.enqueueBbqConfirmed).toHaveBeenCalledWith('reservation-1', 'intent-1');
  });

  it('routes a reconciliation-required event to enqueuePaymentException with the raw payload', async () => {
    const jobs = jobsMock();
    const processor = new NotificationSendProcessor(jobs as never);
    const payload = { paymentIntentId: 'intent-1', bookingId: 'booking-1', bbqReservationId: null, reason: 'UNDERPAYMENT', expectedAmount: '1200000', receivedAmount: '1000000' };

    await processor.process(job({ eventType: 'payment.reconciliation.required.sandbox', payload }));

    expect(jobs.enqueuePaymentException).toHaveBeenCalledWith(payload);
  });

  it('ignores an event type with no notification template, without throwing', async () => {
    const jobs = jobsMock();
    const processor = new NotificationSendProcessor(jobs as never);

    await expect(processor.process(job({ eventType: 'booking.created.public_sandbox', payload: {} }))).resolves.toBeUndefined();
    expect(jobs.enqueueBookingConfirmed).not.toHaveBeenCalled();
  });

  it('throws when a required payload field is missing, so the job retries rather than silently losing the event', async () => {
    const jobs = jobsMock();
    const processor = new NotificationSendProcessor(jobs as never);

    await expect(
      processor.process(job({ eventType: 'booking.confirmed.payment.sandbox', payload: {} })),
    ).rejects.toThrow(/bookingId/);
  });
});
