import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    controller = module.get(HealthController);
  });

  it('live returns ok', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('ready returns ok', () => {
    expect(controller.ready()).toEqual({ status: 'ok' });
  });

  it('dependencies returns status with dependency map', () => {
    const result = controller.dependencies();
    expect(result.status).toBe('ok');
    expect(result.dependencies).toBeDefined();
  });
});
