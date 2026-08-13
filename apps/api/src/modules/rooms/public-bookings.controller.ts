import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../../common/interceptors/correlation-id.interceptor';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { CreatePublicRoomBookingDto } from './dto/create-public-room-booking.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PublicBookingsService } from './public-bookings.service';

@ApiTags('Public sandbox booking')
@Controller('public/room-bookings')
export class PublicBookingsController {
  constructor(private readonly bookings: PublicBookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a synthetic room booking and safe payment reference' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  create(@Body() dto: CreatePublicRoomBookingDto, @Headers('idempotency-key') idempotencyKey: string | undefined, @Headers(CORRELATION_ID_HEADER) correlationId: string | undefined, @Req() request: Request) {
    return this.bookings.create(dto, idempotencyKey ?? '', { correlationId, ipAddress: request.ip, userAgent: request.get('user-agent') });
  }
}
