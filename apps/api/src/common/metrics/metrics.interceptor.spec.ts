import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

function createMockContext(overrides?: { type?: string; route?: string; method?: string; statusCode?: number }): {
  context: ExecutionContext;
} {
  const req = { method: overrides?.method ?? 'GET', route: overrides?.route ? { path: overrides.route } : undefined };
  const res = { statusCode: overrides?.statusCode ?? 200 };
  const context = {
    getType: () => overrides?.type ?? 'http',
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
  return { context };
}

describe('MetricsInterceptor', () => {
  it('records a successful request against the matched route pattern, not the raw URL', async () => {
    const metrics = new MetricsService();
    const recordRequest = jest.spyOn(metrics, 'recordRequest');
    const interceptor = new MetricsInterceptor(metrics);
    const { context } = createMockContext({ route: '/api/v1/admin/bookings/:id', statusCode: 200 });

    await lastValueFrom(interceptor.intercept(context, { handle: () => of('ok') } as CallHandler));

    expect(recordRequest).toHaveBeenCalledWith('GET', '/api/v1/admin/bookings/:id', 200, expect.any(Number));
  });

  it('still records a failed request (error path), not just successes', async () => {
    const metrics = new MetricsService();
    const recordRequest = jest.spyOn(metrics, 'recordRequest');
    const interceptor = new MetricsInterceptor(metrics);
    const { context } = createMockContext({ route: '/api/v1/auth/login', statusCode: 401 });

    await expect(lastValueFrom(interceptor.intercept(context, { handle: () => throwError(() => new Error('boom')) } as CallHandler))).rejects.toThrow('boom');

    expect(recordRequest).toHaveBeenCalledWith('GET', '/api/v1/auth/login', 401, expect.any(Number));
  });

  it('labels an unmatched route (no request.route, e.g. a 404) instead of throwing', async () => {
    const metrics = new MetricsService();
    const recordRequest = jest.spyOn(metrics, 'recordRequest');
    const interceptor = new MetricsInterceptor(metrics);
    const { context } = createMockContext({ route: undefined, statusCode: 404 });

    await lastValueFrom(interceptor.intercept(context, { handle: () => of('not found') } as CallHandler));

    expect(recordRequest).toHaveBeenCalledWith('GET', 'unmatched', 404, expect.any(Number));
  });

  it('skips non-HTTP contexts (e.g. a queue processor) without recording anything', async () => {
    const metrics = new MetricsService();
    const recordRequest = jest.spyOn(metrics, 'recordRequest');
    const interceptor = new MetricsInterceptor(metrics);
    const { context } = createMockContext({ type: 'rpc' });

    await lastValueFrom(interceptor.intercept(context, { handle: () => of('ok') } as CallHandler));

    expect(recordRequest).not.toHaveBeenCalled();
  });
});
