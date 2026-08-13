import { UnsupportedMediaTypeException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { SecurityConfig } from './security.config';

export function applySecurityHeaders(response: Response, config: SecurityConfig): void {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
  ];
  if (config.environment === 'production') directives.push('upgrade-insecure-requests');

  response.setHeader('Content-Security-Policy', directives.join('; '));
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=()');
  if (config.environment === 'production') {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

export function securityHeadersMiddleware(config: SecurityConfig) {
  return (_request: Request, response: Response, next: NextFunction): void => {
    applySecurityHeaders(response, config);
    next();
  };
}

export function requireJsonForAuth(request: Request, _response: Response, next: NextFunction): void {
  if (request.method === 'POST' && /^\/api\/v1\/auth\/(login|refresh)$/.test(request.path) && !request.is('application/json')) {
    next(new UnsupportedMediaTypeException({
      code: 'UNSUPPORTED_CONTENT_TYPE',
      message: 'Content-Type must be application/json',
    }));
    return;
  }
  next();
}

export function clientIp(request: Request, trustedProxyIps: ReadonlySet<string>): string {
  const remoteAddress = request.socket.remoteAddress ?? '';
  if (!trustedProxyIps.has(remoteAddress)) return remoteAddress;

  const forwarded = request.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return first?.split(',')[0]?.trim() || remoteAddress;
}
