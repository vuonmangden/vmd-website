import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../../common/interceptors/correlation-id.interceptor';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { CreatePublicBbqReservationDto } from './dto/create-public-bbq-reservation.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PublicBbqReservationsService } from './public-bbq-reservations.service';

@ApiTags('Public sandbox BBQ')
@Controller('public/bbq-reservations')
export class PublicBbqReservationsController {
  constructor(private readonly reservations: PublicBbqReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a synthetic BBQ table reservation, deposit hold and safe payment reference' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  create(@Body() dto: CreatePublicBbqReservationDto, @Headers('idempotency-key') idempotencyKey: string | undefined, @Headers(CORRELATION_ID_HEADER) correlationId: string | undefined, @Req() request: Request) {
    return this.reservations.create(dto, idempotencyKey ?? '', { correlationId, ipAddress: request.ip, userAgent: request.get('user-agent') });
  }
}
