import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AuthModule } from './modules/auth/auth.module';

describe('AppModule', () => {
  it('creates the API shell', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, ThrottlerModule.forRoot([]), HealthModule, CustomersModule, AuthModule],
    })
      .overrideProvider('BullQueue_outbox-publish')
      .useValue({})
      .compile();

    expect(module).toBeDefined();
  });
});
