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

  /**
   * A bare `void this.sweep()` leaks a rejected promise, which Node responds
   * to by terminating the process — so a transient database error would take
   * the whole API down instead of retrying on the next tick.
   */
  it('survives a failing sweep, logs it, and keeps sweeping on later ticks', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => { unhandled.push(reason); };
    process.on('unhandledRejection', onUnhandled);

    const payments = { expireDue: jest.fn().mockRejectedValue(new Error('database is unavailable')) };
    const resourceHolds = resourceHoldsMock();
    const service = new HoldExpirySweepService(payments as never, resourceHolds as never);
    const logged = jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    service.onModuleInit();
    jest.advanceTimersByTime(5 * 60_000);
    await Promise.resolve();
    await Promise.resolve();

    // The failure must not have escaped as an unhandled rejection...
    process.off('unhandledRejection', onUnhandled);
    expect(unhandled).toEqual([]);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('database is unavailable'));

    // ...and the loop must still be alive for the next interval.
    payments.expireDue.mockResolvedValue({ expired: 1 });
    jest.advanceTimersByTime(5 * 60_000);
    expect(payments.expireDue).toHaveBeenCalledTimes(2);

    service.onModuleDestroy();
    logged.mockRestore();
  });
});
