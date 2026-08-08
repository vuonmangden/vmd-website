import { Test } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

describe('PrismaModule', () => {
  it('exports PrismaService', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
    const service = module.get(PrismaService);
    expect(service).toBeDefined();
    expect(service.onModuleInit).toBeDefined();
    expect(service.onModuleDestroy).toBeDefined();
  });
});
