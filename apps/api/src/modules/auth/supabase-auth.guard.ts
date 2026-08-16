import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StaffService } from './staff.service';

interface JwtHeader {
  alg: string;
  typ?: string;
}

interface JwtPayload {
  sub: string;
  exp: number;
  aud?: string;
  iss?: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(private readonly staffService: StaffService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      staff?: unknown;
    }>();

    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const payload = this.verifyJwt(token);

    const staff = await this.staffService.findByAuthUserId(payload.sub);
    if (!staff) {
      throw new UnauthorizedException('Staff member not found');
    }

    if (!staff.isActive) {
      throw new ForbiddenException('Staff account is deactivated');
    }

    request.staff = staff;
    return true;
  }

  private verifyJwt(token: string): JwtPayload {
    const secret = process.env['SUPABASE_JWT_SECRET'];
    if (!secret) {
      this.logger.error('SUPABASE_JWT_SECRET is not configured');
      throw new UnauthorizedException('Authentication service unavailable');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    const header: JwtHeader = JSON.parse(
      Buffer.from(headerB64!, 'base64url').toString(),
    );
    if (header.alg !== 'HS256') {
      throw new UnauthorizedException('Unsupported token algorithm');
    }

    const expectedSig = createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest();

    const actualSig = Buffer.from(signatureB64!, 'base64url');

    if (
      expectedSig.length !== actualSig.length ||
      !timingSafeEqual(expectedSig, actualSig)
    ) {
      throw new UnauthorizedException('Invalid token signature');
    }

    const payload: JwtPayload = JSON.parse(
      Buffer.from(payloadB64!, 'base64url').toString(),
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      throw new UnauthorizedException('Token has expired');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Token missing subject');
    }

    return payload;
  }
}
