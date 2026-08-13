import type { Request, Response } from 'express';
import { applySecurityHeaders, clientIp, requireJsonForAuth } from './security.middleware';
import type { SecurityConfig } from './security.config';

const staging: SecurityConfig = {
  environment: 'staging', corsOrigins: new Set(), trustedProxyIps: new Set(), requestBodyLimit: '32kb',
};

describe('security middleware', () => {
  it('sets CSP and defensive response headers, with HSTS only in production', () => {
    const setHeader = jest.fn();
    applySecurityHeaders({ setHeader } as unknown as Response, staging);
    expect(setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.stringContaining("frame-ancestors 'none'"));
    expect(setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(setHeader).not.toHaveBeenCalledWith('Strict-Transport-Security', expect.anything());

    applySecurityHeaders({ setHeader } as unknown as Response, { ...staging, environment: 'production' });
    expect(setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  });

  it('rejects a non-JSON login request before credential handling', () => {
    const next = jest.fn();
    requireJsonForAuth({ method: 'POST', path: '/api/v1/auth/login', is: jest.fn().mockReturnValue(false) } as unknown as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 415 }));
  });

  it('uses forwarded IP only when the socket peer is explicitly trusted', () => {
    const request = {
      socket: { remoteAddress: '10.0.0.10' },
      headers: { 'x-forwarded-for': '198.51.100.4, 10.0.0.10' },
    } as unknown as Request;
    expect(clientIp(request, new Set(['10.0.0.10']))).toBe('198.51.100.4');
    expect(clientIp(request, new Set())).toBe('10.0.0.10');
  });
});
