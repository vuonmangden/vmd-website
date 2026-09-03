import { RedisHealthService } from './redis-health.service';

function mockClient(overrides?: { status?: string; connect?: jest.Mock; ping?: jest.Mock }) {
  return {
    status: overrides?.status ?? 'ready',
    connect: overrides?.connect ?? jest.fn().mockResolvedValue(undefined),
    ping: overrides?.ping ?? jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn(),
  };
}

describe('RedisHealthService.isHealthy', () => {
  it('returns true when the client is already ready and ping succeeds', async () => {
    const client = mockClient({ status: 'ready' });
    const service = new RedisHealthService(client as never);
    await expect(service.isHealthy()).resolves.toBe(true);
    expect(client.connect).not.toHaveBeenCalled();
    expect(client.ping).toHaveBeenCalled();
  });

  it('connects first when the client is not yet ready, then pings', async () => {
    const client = mockClient({ status: 'wait' });
    const service = new RedisHealthService(client as never);
    await expect(service.isHealthy()).resolves.toBe(true);
    expect(client.connect).toHaveBeenCalled();
  });

  it('returns false when connect rejects', async () => {
    const client = mockClient({ status: 'wait', connect: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) });
    const service = new RedisHealthService(client as never);
    await expect(service.isHealthy()).resolves.toBe(false);
  });

  it('returns false when ping rejects', async () => {
    const client = mockClient({ ping: jest.fn().mockRejectedValue(new Error('timeout')) });
    const service = new RedisHealthService(client as never);
    await expect(service.isHealthy()).resolves.toBe(false);
  });
});

describe('RedisHealthService.onModuleDestroy', () => {
  it('disconnects the client', () => {
    const client = mockClient();
    const service = new RedisHealthService(client as never);
    service.onModuleDestroy();
    expect(client.disconnect).toHaveBeenCalled();
  });
});
