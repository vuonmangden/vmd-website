import type { ExecutionContext } from '@nestjs/common';
import type { AuthService } from './auth.service';
import { AdminAuthGuard } from './admin-auth.guard';

describe('AdminAuthGuard', () => {
  it('loads the trusted actor before allowing a protected controller', async () => {
    const request = { headers: { 'x-correlation-id': 'correlation-test' } };
    const getActorForRequest = jest.fn().mockResolvedValue({ permissions: ['report.read'] });
    const guard = new AdminAuthGuard({ getActorForRequest } as unknown as AuthService);

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(getActorForRequest).toHaveBeenCalledWith(request, 'correlation-test');
  });

  it('fails closed when authentication rejects the request', async () => {
    const getActorForRequest = jest.fn().mockRejectedValue(new Error('denied'));
    const guard = new AdminAuthGuard({ getActorForRequest } as unknown as AuthService);
    await expect(guard.canActivate(context({ headers: {} }))).rejects.toThrow('denied');
  });
});

function context(request: unknown): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}
