import { HoldExpirySweepService } from './hold-expiry-sweep.service';

function paymentsMock(expired = 0) {
  return { expireDue: jest.fn().mockResolvedValue({ expired }) };
}

function resourceHoldsMock(count = 0) {
  return { expireDue: jest.fn().mockResolvedValue({ count }) };
}

describe('HoldExpirySweepService.sweep', () => {
  it('expires due payment intents and due resource holds, and reports both counts', async () => {
    const payments = paymentsMock(2);
    const resourceHolds = resourceHoldsMock(3);
    const service = new HoldExpirySweepService(payments as never, resourceHolds as never);

    const result = await service.sweep();

    expect(payments.expireDue).toHaveBeenCalledTimes(1);
    expect(resourceHolds.expireDue).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ expiredPaymentIntents: 2, expiredHolds: 3 });
  });

  it('reports zero counts when nothing is due', async () => {
    const service = new HoldExpirySweepService(paymentsMock(0) as never, resourceHoldsMock(0) as never);

    const result = await service.sweep();

    expect(result).toEqual({ expiredPaymentIntents: 0, expiredHolds: 0 });
  });
});

describe('HoldExpirySweepService lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sweeps repeatedly on an interval once started, and stops on module destroy', () => {
    const payments = paymentsMock();
    const resourceHolds = resourceHoldsMock();
    const service = new HoldExpirySweepService(payments as never, resourceHolds as never);

    service.onModuleInit();
    jest.advanceTimersByTime(15 * 60_000);
    service.onModuleDestroy();
    jest.advanceTimersByTime(15 * 60_000);

    expect(payments.expireDue).toHaveBeenCalledTimes(3);
  });
});
