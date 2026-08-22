import { NotificationDispatchService } from './notification-dispatch.service';
import { EmailDeliveryError } from './email/email.types';
import { ZaloDeliveryError } from './zalo/zalo.types';

function prismaMock() {
  return {
    notificationJob: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    notificationDelivery: { create: jest.fn() },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
}

function emailMock() {
  return { send: jest.fn() };
}
function zaloMock() {
  return { send: jest.fn() };
}

const EMAIL_JOB = {
  id: 'job-1',
  templateCode: 'BOOKING_CONFIRMED_EMAIL',
  email: 'guest@example.test',
  phone: null,
  payload: { subject: 'Xác nhận', body: 'Nội dung' },
  attemptCount: 0,
};

const ZALO_JOB = {
  id: 'job-2',
  templateCode: 'BOOKING_CONFIRMED_ZALO',
  email: null,
  phone: '0987654321',
  payload: { templateParams: { bookingCode: 'VMD-1' } },
  attemptCount: 0,
};

describe('NotificationDispatchService.pollAndDispatch', () => {
  it('returns 0 when there is nothing due', async () => {
    const prisma = prismaMock();
    const service = new NotificationDispatchService(prisma as never, emailMock() as never, zaloMock() as never);

    expect(await service.pollAndDispatch()).toBe(0);
  });

  it('sends an email job and records a completed delivery', async () => {
    const prisma = prismaMock();
    prisma.notificationJob.findMany.mockResolvedValue([EMAIL_JOB]);
    const email = emailMock();
    email.send.mockResolvedValue({ provider: 'mailpit', providerMessageId: 'job-1', status: 'sent' });
    const service = new NotificationDispatchService(prisma as never, email as never, zaloMock() as never);

    const dispatched = await service.pollAndDispatch();

    expect(dispatched).toBe(1);
    expect(email.send).toHaveBeenCalledWith({ correlationId: 'job-1', recipient: 'guest@example.test', subject: 'Xác nhận', text: 'Nội dung' });
    expect(prisma.notificationDelivery.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ jobId: 'job-1', channel: 'email', status: 'sent' }) }));
    expect(prisma.notificationJob.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'job-1' }, data: expect.objectContaining({ status: 'completed' }) }));
  });

  it('sends a Zalo job through templateCode/templateParams, not rendered text', async () => {
    const prisma = prismaMock();
    prisma.notificationJob.findMany.mockResolvedValue([ZALO_JOB]);
    const zalo = zaloMock();
    zalo.send.mockResolvedValue({ provider: 'mock', providerMessageId: 'job-2', status: 'sent' });
    const service = new NotificationDispatchService(prisma as never, emailMock() as never, zalo as never);

    await service.pollAndDispatch();

    expect(zalo.send).toHaveBeenCalledWith({ correlationId: 'job-2', recipientPhone: '0987654321', templateCode: 'BOOKING_CONFIRMED_ZALO', templateParams: { bookingCode: 'VMD-1' } });
  });

  it('keeps a job pending for a retryable failure under the attempt ceiling', async () => {
    const prisma = prismaMock();
    prisma.notificationJob.findMany.mockResolvedValue([{ ...EMAIL_JOB, attemptCount: 1 }]);
    const email = emailMock();
    email.send.mockRejectedValue(new EmailDeliveryError('provider_unavailable', true, 'mailpit'));
    const service = new NotificationDispatchService(prisma as never, email as never, zaloMock() as never);

    await service.pollAndDispatch();

    expect(prisma.notificationJob.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'pending', lastError: expect.stringContaining('provider_unavailable') }) }));
  });

  it('marks a job failed once the retry ceiling is reached, even for a retryable error', async () => {
    const prisma = prismaMock();
    prisma.notificationJob.findMany.mockResolvedValue([{ ...EMAIL_JOB, attemptCount: 3 }]);
    const email = emailMock();
    email.send.mockRejectedValue(new EmailDeliveryError('provider_unavailable', true, 'mailpit'));
    const service = new NotificationDispatchService(prisma as never, email as never, zaloMock() as never);

    await service.pollAndDispatch();

    expect(prisma.notificationJob.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }));
  });

  it('marks a job failed immediately for a non-retryable error, regardless of attempt count', async () => {
    const prisma = prismaMock();
    prisma.notificationJob.findMany.mockResolvedValue([EMAIL_JOB]);
    const email = emailMock();
    email.send.mockRejectedValue(new EmailDeliveryError('rejected', false, 'mailpit'));
    const service = new NotificationDispatchService(prisma as never, email as never, zaloMock() as never);

    await service.pollAndDispatch();

    expect(prisma.notificationJob.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }));
  });

  it('records a disabled Zalo channel as a normal non-retryable failure, per §22.3 (email still stands alone)', async () => {
    const prisma = prismaMock();
    prisma.notificationJob.findMany.mockResolvedValue([ZALO_JOB]);
    const zalo = zaloMock();
    zalo.send.mockRejectedValue(new ZaloDeliveryError('disabled', false, null));
    const service = new NotificationDispatchService(prisma as never, emailMock() as never, zalo as never);

    await service.pollAndDispatch();

    expect(prisma.notificationDelivery.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'failed', channel: 'zalo' }) }));
    expect(prisma.notificationJob.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }));
  });
});
