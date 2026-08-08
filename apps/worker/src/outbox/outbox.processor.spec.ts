import { Test } from '@nestjs/testing';
import { OutboxProcessor } from './outbox.processor';
import { PrismaService } from '../prisma/prisma.service';

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
        eventType: 'customer.created',
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
      expect(mockQueue.add).toHaveBeenCalledWith('customer.created', {
        eventId: 'event-1',
        aggregateType: 'customer',
        aggregateId: 'cust-1',
        eventType: 'customer.created',
        payload: { customerId: 'cust-1' },
      });
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
        eventType: 'customer.created',
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
        eventType: 'booking.created',
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
      );
    });
  });
});
