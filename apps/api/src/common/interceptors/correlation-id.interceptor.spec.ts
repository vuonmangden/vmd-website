import { CorrelationIdInterceptor, CORRELATION_ID_HEADER } from './correlation-id.interceptor';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';

function createMockContext(headers: Record<string, string> = {}): {
  context: ExecutionContext;
  req: { headers: Record<string, string> };
  res: { setHeader: jest.Mock };
} {
  const req = { headers: { ...headers } };
  const res = { setHeader: jest.fn() };
  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
  return { context, req, res };
}

describe('CorrelationIdInterceptor', () => {
  const interceptor = new CorrelationIdInterceptor();
  const next: CallHandler = { handle: () => of('test') };

  it('generates a correlation ID when none is provided', async () => {
    const { context, req } = createMockContext();
    await lastValueFrom(interceptor.intercept(context, next));
    const id = req.headers[CORRELATION_ID_HEADER] as string;
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('preserves a valid incoming correlation ID', async () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const { context, req } = createMockContext({
      [CORRELATION_ID_HEADER]: validUuid,
    });
    await lastValueFrom(interceptor.intercept(context, next));
    expect(req.headers[CORRELATION_ID_HEADER]).toBe(validUuid);
  });

  it('replaces an invalid correlation ID', async () => {
    const { context, req } = createMockContext({
      [CORRELATION_ID_HEADER]: 'not-a-uuid',
    });
    await lastValueFrom(interceptor.intercept(context, next));
    expect(req.headers[CORRELATION_ID_HEADER]).not.toBe('not-a-uuid');
  });

  it('sets the correlation ID on the response header', async () => {
    const { context, res } = createMockContext();
    await lastValueFrom(interceptor.intercept(context, next));
    expect(res.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      expect.any(String),
    );
  });
});
