import { UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SePayWebhookService } from './sepay-webhook.service';

const payload = {
  id: 'sepay-event-1', gateway: 'MBBank', transactionDate: '2026-08-13 10:00:00', accountNumber: '1234567890', subAccount: '', transferType: 'in' as const,
  transferAmount: 2500000, accumulated: 2500000, code: '', content: 'VMD BK260813A1B2', referenceCode: 'ref-1', description: 'sandbox payment',
};

function fixture() {
  const prisma = { paymentWebhookEvent: { create: jest.fn().mockResolvedValue({ id: '00000000-0000-4000-8000-000000000001' }), findUnique: jest.fn().mockResolvedValue({ id: '00000000-0000-4000-8000-000000000001', processingStatus: 'RECEIVED' }) } };
  const queue = { add: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn().mockReturnValue({ apiKey: 'test-api-key', provider: 'SEPAY_TEST', mode: 'sandbox' }) };
  return { prisma, queue, config, service: new SePayWebhookService(prisma as never, config as never, queue as never) };
}

describe('SePayWebhookService', () => {
  it('authenticates, persists the event before queueing, and never stores Authorization', async () => {
    const { service, prisma, queue } = fixture();
    await expect(service.receive(payload, 'Apikey test-api-key', '00000000-0000-4000-8000-000000000002')).resolves.toEqual({ received: true, duplicate: false });
    expect(prisma.paymentWebhookEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ provider: 'SEPAY_TEST', providerEventId: payload.id, providerTransactionId: 'ref-1', signatureValid: true, processingStatus: 'RECEIVED', headers: { correlationId: '00000000-0000-4000-8000-000000000002' } }) }));
    expect(queue.add).toHaveBeenCalledWith('process-sepay-transaction', { eventId: '00000000-0000-4000-8000-000000000001' }, expect.objectContaining({ jobId: 'sepay:sepay-event-1' }));
    expect(prisma.paymentWebhookEvent.create.mock.invocationCallOrder[0]!).toBeLessThan(queue.add.mock.invocationCallOrder[0]!);
  });

  it('rejects an absent or malformed API key without persisting an event', async () => {
    const { service, prisma } = fixture();
    await expect(service.receive(payload, undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.receive(payload, 'Bearer test-api-key')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('acknowledges a duplicate provider event and safely retries queue handoff when it is still unprocessed', async () => {
    const { service, prisma, queue } = fixture();
    prisma.paymentWebhookEvent.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));
    await expect(service.receive(payload, 'Apikey test-api-key')).resolves.toEqual({ received: true, duplicate: true });
    expect(queue.add).toHaveBeenCalledWith('process-sepay-transaction', { eventId: '00000000-0000-4000-8000-000000000001' }, expect.objectContaining({ jobId: 'sepay:sepay-event-1' }));
  });

  it('deduplicates a repeated provider transaction identity even when the event id differs', async () => {
    const { service, prisma, queue } = fixture();
    prisma.paymentWebhookEvent.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));
    prisma.paymentWebhookEvent.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: '00000000-0000-4000-8000-000000000001', processingStatus: 'PROCESSED' });
    await expect(service.receive({ ...payload, id: 'sepay-event-2' }, 'Apikey test-api-key')).resolves.toEqual({ received: true, duplicate: true });
    expect(queue.add).not.toHaveBeenCalled();
  });
});
