import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  $queryRawUnsafe: jest.fn(),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    controller = module.get(HealthController);
  });

  it('live returns ok', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('ready returns ok', () => {
    expect(controller.ready()).toEqual({ status: 'ok' });
  });

  it('dependencies returns healthy when database is reachable', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);
    const result = await controller.dependencies();
    expect(result.status).toBe('ok');
    expect(result.dependencies.database).toBe('healthy');
  });

  it('dependencies returns unhealthy when database is unreachable', async () => {
    mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('Connection refused'));
    const result = await controller.dependencies();
    expect(result.status).toBe('degraded');
    expect(result.dependencies.database).toBe('unhealthy');
  });
});
