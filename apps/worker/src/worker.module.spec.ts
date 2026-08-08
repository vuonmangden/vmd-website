import { Test } from '@nestjs/testing';
import { OutboxProcessor } from './outbox/outbox.processor';
import { PrismaService } from './prisma/prisma.service';

describe('WorkerModule', () => {
  it('creates outbox processor with mocked dependencies', async () => {
    const module = await Test.createTestingModule({
      providers: [
        OutboxProcessor,
        { provide: PrismaService, useValue: { outboxEvent: {} } },
      ],
    }).compile();

    expect(module).toBeDefined();
    expect(module.get(OutboxProcessor)).toBeDefined();
  });
});
