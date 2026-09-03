import { Test } from '@nestjs/testing';
import { OutboxProcessor } from './outbox.processor';
import { PrismaService } from '../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('OutboxProcessor', () => {
  let processor: OutboxProcessor;
  let prisma: {
    outboxEvent: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      outboxEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        OutboxProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('outbox-publish'), useValue: { add: jest.fn() } },
        { provide: getQueueToken('notification-send'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    processor = module.get(OutboxProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('pollAndPublish', () => {
    it('returns 0 when no pending events', async () => {
      prisma.outboxEvent.findMany.mockResolvedValue([]);
      const result = await processor.pollAndPublish();
      expect(result).toBe(0);
    });

    it('publishes event to queue and marks as published', async () => {
      const mockEvent = {
        id: 'event-1',
        aggregateType: 'customer',
        aggregateId: 'cust-1',
        eventType: 'booking.confirmed.payment.sandbox',
        payload: { customerId: 'cust-1' },
        status: 'pending',
        attemptCount: 0,
        createdAt: new Date(),
      };
      prisma.outboxEvent.findMany.mockResolvedValue([mockEvent]);

      const mockQueue = { add: jest.fn().mockResolvedValue({}) };
      processor.registerQueue('notification-send', mockQueue as never);

      const result = await processor.pollAndPublish();

      expect(result).toBe(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'booking.confirmed.payment.sandbox',
        {
          eventId: 'event-1',
          aggregateType: 'customer',
          aggregateId: 'cust-1',
          eventType: 'booking.confirmed.payment.sandbox',
          payload: { customerId: 'cust-1' },
        },
        { jobId: 'event-1' },
      );
      expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: {
          status: 'published',
          publishedAt: expect.any(Date),
          attemptCount: 1,
        },
      });
    });

    it('marks event as failed after max retries', async () => {
      const mockEvent = {
        id: 'event-2',
        aggregateType: 'customer',
        aggregateId: 'cust-2',
        eventType: 'booking.confirmed.payment.sandbox',
        payload: {},
        status: 'pending',
        attemptCount: 4,
        createdAt: new Date(),
      };
      prisma.outboxEvent.findMany.mockResolvedValue([mockEvent]);

      const mockQueue = {
        add: jest.fn().mockRejectedValue(new Error('redis down')),
      };
      processor.registerQueue('notification-send', mockQueue as never);

      const result = await processor.pollAndPublish();

      expect(result).toBe(0);
      expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-2' },
        data: {
          status: 'failed',
          attemptCount: 5,
        },
      });
    });

    it('keeps event pending on error if under max retries', async () => {
      const mockEvent = {
        id: 'event-3',
        aggregateType: 'booking',
        aggregateId: 'bkg-1',
        eventType: 'bbq_reservation.confirmed.payment.sandbox',
        payload: {},
        status: 'pending',
        attemptCount: 1,
        createdAt: new Date(),
      };
      prisma.outboxEvent.findMany.mockResolvedValue([mockEvent]);

      const mockQueue = {
        add: jest.fn().mockRejectedValue(new Error('timeout')),
      };
      processor.registerQueue('notification-send', mockQueue as never);

      const result = await processor.pollAndPublish();

      expect(result).toBe(0);
      expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-3' },
        data: {
          status: 'pending',
          attemptCount: 2,
        },
      });
    });

    it('falls back to outbox-publish queue for unknown event types', async () => {
      const mockEvent = {
        id: 'event-4',
        aggregateType: 'unknown',
        aggregateId: 'x',
        eventType: 'unknown.event',
        payload: {},
        status: 'pending',
        attemptCount: 0,
        createdAt: new Date(),
      };
      prisma.outboxEvent.findMany.mockResolvedValue([mockEvent]);

      const mockQueue = { add: jest.fn().mockResolvedValue({}) };
      processor.registerQueue('outbox-publish', mockQueue as never);

      const result = await processor.pollAndPublish();

      expect(result).toBe(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'unknown.event',
        expect.objectContaining({ eventId: 'event-4' }),
        { jobId: 'event-4' },
      );
    });

    it('does not mark an event published when its queue is unavailable', async () => {
      const event = {
        id: 'event-5', aggregateType: 'customer', aggregateId: 'cust-5',
        eventType: 'booking.confirmed.payment.sandbox', payload: {}, status: 'pending',
        attemptCount: 0, createdAt: new Date(),
      };
      prisma.outboxEvent.findMany.mockResolvedValue([event]);
      processor.registerQueue('notification-send', undefined as never);

      expect(await processor.pollAndPublish()).toBe(0);
      expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-5' },
        data: { status: 'pending', attemptCount: 1 },
      });
    });
  });

  describe('lifecycle', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    /**
     * The per-event `try` does not cover the opening `findMany`, so a leaked
     * rejection there terminates the worker instead of retrying next tick.
     */
    it('survives a failing poll without leaking an unhandled rejection, and keeps polling', async () => {
      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown): void => { unhandled.push(reason); };
      process.on('unhandledRejection', onUnhandled);

      prisma.outboxEvent.findMany.mockRejectedValue(new Error('database is unavailable'));
      const logged = jest.spyOn(processor['logger'], 'error').mockImplementation(() => undefined);

      processor.onModuleInit();
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
      await Promise.resolve();

      process.off('unhandledRejection', onUnhandled);
      expect(unhandled).toEqual([]);
      expect(logged).toHaveBeenCalledWith(expect.stringContaining('database is unavailable'));

      processor.onModuleDestroy();
      logged.mockRestore();
    });
  });
});
