import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisHealthService } from './redis-health.service';

const mockPrisma = {
  $queryRawUnsafe: jest.fn(),
};
const mockRedisHealth = {
  isHealthy: jest.fn(),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    mockRedisHealth.isHealthy.mockReset().mockResolvedValue(true);
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisHealthService, useValue: mockRedisHealth },
      ],
    }).compile();
    controller = module.get(HealthController);
  });

  it('live returns ok', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('ready returns ok', () => {
    expect(controller.ready()).toEqual({ status: 'ok' });
  });

  it('dependencies returns healthy when database and redis are both reachable', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);
    const result = await controller.dependencies();
    expect(result.status).toBe('ok');
    expect(result.dependencies.database).toBe('healthy');
    expect(result.dependencies.redis).toBe('healthy');
  });

  it('dependencies returns degraded when database is unreachable', async () => {
    mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('Connection refused'));
    const result = await controller.dependencies();
    expect(result.status).toBe('degraded');
    expect(result.dependencies.database).toBe('unhealthy');
  });

  it('dependencies returns degraded when redis is not reachable', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);
    mockRedisHealth.isHealthy.mockResolvedValue(false);
    const result = await controller.dependencies();
    expect(result.status).toBe('degraded');
    expect(result.dependencies.redis).toBe('unhealthy');
    expect(result.dependencies.database).toBe('healthy');
  });
});
