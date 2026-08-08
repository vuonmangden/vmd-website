import { Test } from '@nestjs/testing';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { CustomersModule } from './modules/customers/customers.module';

describe('AppModule', () => {
  it('creates the API shell', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, HealthModule, CustomersModule],
    })
      .overrideProvider('BullQueue_outbox-publish')
      .useValue({})
      .compile();

    expect(module).toBeDefined();
  });
});
