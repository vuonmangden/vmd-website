import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../../common/interceptors/correlation-id.interceptor';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { CreatePublicBbqReservationDto } from './dto/create-public-bbq-reservation.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PublicBbqReservationsService } from './public-bbq-reservations.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PublicBbqRateLimitService } from './public-bbq-rate-limit.service';

@ApiTags('Public BBQ')
@Controller('public/bbq-reservations')
export class PublicBbqReservationsController {
  constructor(private readonly reservations: PublicBbqReservationsService, private readonly rateLimit: PublicBbqRateLimitService) {}

  @Post()
  @ApiOperation({ summary: 'Create a BBQ booking request pending front-desk confirmation' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiTooManyRequestsResponse({ description: 'Per-client reservation creation limit exceeded' })
  create(@Body() dto: CreatePublicBbqReservationDto, @Headers('idempotency-key') idempotencyKey: string | undefined, @Headers(CORRELATION_ID_HEADER) correlationId: string | undefined, @Req() request: Request) {
    this.rateLimit.check(request.ip);
    return this.reservations.create(dto, idempotencyKey ?? '', { correlationId, ipAddress: request.ip, userAgent: request.get('user-agent') });
  }
}
