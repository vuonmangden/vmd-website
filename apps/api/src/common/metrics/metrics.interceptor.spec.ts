import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { lastValueFrom, of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

/**
 * A real EventEmitter standing in for Express's `Response`, so `finish` can
 * be emitted independently of when the interceptor's observable settles —
 * exactly like production, where Nest's exception filter sets the real
 * status code and calls `res.end()` (emitting `finish`) only after the
 * interceptor's own RxJS chain has already unwound.
 */
function createMockResponse(initialStatusCode = 200): EventEmitter & { statusCode: number } {
  const response = new EventEmitter() as EventEmitter & { statusCode: number };
  response.statusCode = initialStatusCode;
  return response;
}

function createMockContext(overrides: { type?: string; route?: string; method?: string; response: EventEmitter & { statusCode: number } }): {
  context: ExecutionContext;
} {
  const req = { method: overrides.method ?? 'GET', route: overrides.route ? { path: overrides.route } : undefined };
  const context = {
    getType: () => overrides.type ?? 'http',
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => overrides.response }),
  } as unknown as ExecutionContext;
  return { context };
}

describe('MetricsInterceptor', () => {
  it('records a successful request against the matched route pattern, not the raw URL', async () => {
    const metrics = new MetricsService();
    const recordRequest = jest.spyOn(metrics, 'recordRequest');
    const interceptor = new MetricsInterceptor(metrics);
    const response = createMockResponse(200);
    const { context } = createMockContext({ route: '/api/v1/admin/bookings/:id', response });

    await lastValueFrom(interceptor.intercept(context, { handle: () => of('ok') } as CallHandler));
    response.emit('finish');

    expect(recordRequest).toHaveBeenCalledWith('GET', '/api/v1/admin/bookings/:id', 200, expect.any(Number));
  });

  it('records the real exception-filter status code, not whatever statusCode was at error time', async () => {
    const metrics = new MetricsService();
    const recordRequest = jest.spyOn(metrics, 'recordRequest');
    const interceptor = new MetricsInterceptor(metrics);
    // Starts at Express's default 200, exactly like a real request — the
    // exception filter only flips this to 401 once it runs, after the
    // interceptor's own observable chain has already errored out below.
    const response = createMockResponse(200);
    const { context } = createMockContext({ route: '/api/v1/auth/login', response });

    await expect(lastValueFrom(interceptor.intercept(context, { handle: () => throwError(() => new Error('boom')) } as CallHandler))).rejects.toThrow('boom');
    // Simulates Nest's exception filter running after the interceptor unwinds.
    response.statusCode = 401;
    response.emit('finish');

    expect(recordRequest).toHaveBeenCalledWith('GET', '/api/v1/auth/login', 401, expect.any(Number));
  });

  it('labels an unmatched route (no request.route, e.g. a 404) instead of throwing', async () => {
    const metrics = new MetricsService();
    const recordRequest = jest.spyOn(metrics, 'recordRequest');
    const interceptor = new MetricsInterceptor(metrics);
    const response = createMockResponse(200);
    const { context } = createMockContext({ route: undefined, response });

    await lastValueFrom(interceptor.intercept(context, { handle: () => of('not found') } as CallHandler));
    response.statusCode = 404;
    response.emit('finish');

    expect(recordRequest).toHaveBeenCalledWith('GET', 'unmatched', 404, expect.any(Number));
  });

  it('skips non-HTTP contexts (e.g. a queue processor) without recording anything', async () => {
    const metrics = new MetricsService();
    const recordRequest = jest.spyOn(metrics, 'recordRequest');
    const interceptor = new MetricsInterceptor(metrics);
    const response = createMockResponse(200);
    const { context } = createMockContext({ type: 'rpc', response });

    await lastValueFrom(interceptor.intercept(context, { handle: () => of('ok') } as CallHandler));
    response.emit('finish');

    expect(recordRequest).not.toHaveBeenCalled();
  });

  it('does not record anything if the response never finishes (e.g. client aborted)', async () => {
    const metrics = new MetricsService();
    const recordRequest = jest.spyOn(metrics, 'recordRequest');
    const interceptor = new MetricsInterceptor(metrics);
    const response = createMockResponse(200);
    const { context } = createMockContext({ route: '/api/v1/public/room-types', response });

    await lastValueFrom(interceptor.intercept(context, { handle: () => of('ok') } as CallHandler));

    expect(recordRequest).not.toHaveBeenCalled();
  });
});
