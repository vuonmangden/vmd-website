import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import type { Request } from 'express';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- ValidationPipe reads this class from decorator metadata at runtime.
import { CreateContactSubmissionDto } from './dto/create-contact-submission.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { ContactService } from './contact.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { ContactRateLimitService } from './contact-rate-limit.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { SecurityConfigService } from '../../common/security/security.config';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('Contact')
@Controller('public/contact-submissions')
export class PublicContactController {
  constructor(
    private readonly contact: ContactService,
    private readonly rateLimit: ContactRateLimitService,
    private readonly securityConfig: SecurityConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit a public contact request' })
  @ApiTooManyRequestsResponse({ description: 'More than 3 submissions in 10 minutes from one address' })
  async create(
    @Body() dto: CreateContactSubmissionDto,
    @Req() request: Request,
  ): Promise<{ id: string }> {
    const ipAddress = clientIp(request, this.securityConfig.get().trustedProxyIps);
    this.rateLimit.check(ipAddress);

    return this.contact.submit(
      {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        subject: dto.subject,
        message: dto.message,
      },
      ipAddress,
      correlationId(request),
    );
  }
}

/**
 * Only trusts `x-forwarded-for` when the immediate peer is a configured proxy,
 * otherwise a client could spoof the header to bypass the rate limit.
 */
function clientIp(request: Request, trustedProxyIps: Set<string>): string | undefined {
  const socketAddress = request.socket.remoteAddress ?? undefined;
  if (!socketAddress || !trustedProxyIps.has(socketAddress)) return socketAddress;

  const forwarded = request.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = raw?.split(',')[0]?.trim();
  return first || socketAddress;
}

function correlationId(request: Request): string | null {
  const value = request.headers[CORRELATION_ID_HEADER];
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved ?? null;
}
