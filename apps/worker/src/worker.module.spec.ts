import { Test } from '@nestjs/testing';
import { OutboxProcessor } from './outbox/outbox.processor';
import { PrismaService } from './prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('WorkerModule', () => {
  it('creates outbox processor with mocked dependencies', async () => {
    const module = await Test.createTestingModule({
      providers: [
        OutboxProcessor,
        { provide: PrismaService, useValue: { outboxEvent: {} } },
        { provide: getQueueToken('outbox-publish'), useValue: { add: jest.fn() } },
        { provide: getQueueToken('notification-send'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    expect(module).toBeDefined();
    expect(module.get(OutboxProcessor)).toBeDefined();
  });
});
