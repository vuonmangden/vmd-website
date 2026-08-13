import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

function createMockHost(headers: Record<string, string> = {}): {
  host: ArgumentsHost;
  res: { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock };
} {
  const json = jest.fn();
  const res = {
    status: jest.fn().mockReturnValue({ json }),
    json,
    setHeader: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { ...headers } }),
      getResponse: () => res,
    }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('formats HttpException into standard error response', () => {
    const { host, res } = createMockHost({
      'x-correlation-id': 'test-id',
    });
    filter.catch(new HttpException('Not Found', HttpStatus.NOT_FOUND), host);
    expect(res.status).toHaveBeenCalledWith(404);
    const body = (res.status.mock.results[0]!.value as { json: jest.Mock }).json.mock.calls[0][0];
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.correlationId).toBe('test-id');
  });

  it('formats unknown exceptions as 500', () => {
    const { host, res } = createMockHost();
    filter.catch(new Error('boom'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.status.mock.results[0]!.value as { json: jest.Mock }).json.mock.calls[0][0];
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred');
  });

  it('formats validation errors with details', () => {
    const { host, res } = createMockHost();
    const exception = new HttpException(
      { message: ['field must be string', 'field2 required'], statusCode: 400 },
      HttpStatus.BAD_REQUEST,
    );
    filter.catch(exception, host);
    const body = (res.status.mock.results[0]!.value as { json: jest.Mock }).json.mock.calls[0][0];
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.fields).toHaveLength(2);
  });

  it('returns a stable error for an oversized parsed request body', () => {
    const { host, res } = createMockHost();
    filter.catch(Object.assign(new Error('too large'), { status: 413, type: 'entity.too.large' }), host);
    const body = (res.status.mock.results[0]!.value as { json: jest.Mock }).json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(413);
    expect(body.error).toMatchObject({ code: 'REQUEST_BODY_TOO_LARGE', message: 'Request body is too large' });
  });
});
