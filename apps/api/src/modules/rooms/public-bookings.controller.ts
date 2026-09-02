import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiHeader, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../../common/interceptors/correlation-id.interceptor';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { CreatePublicRoomBookingDto } from './dto/create-public-room-booking.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PublicBookingsService } from './public-bookings.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PublicBookingRateLimitService } from './public-booking-rate-limit.service';

@ApiTags('Public room booking')
@Controller('public/room-bookings')
export class PublicBookingsController {
  constructor(private readonly bookings: PublicBookingsService, private readonly rateLimit: PublicBookingRateLimitService) {}

  @Post()
  @ApiOperation({ summary: 'Create a production room hold and safe payment reference' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ description: 'Booking, hold and payment reference created atomically' })
  @ApiBadRequestResponse({ description: 'Invalid dates, guests, consent, contact data or mattress selection' })
  @ApiConflictResponse({ description: 'Room allocation or idempotency conflict' })
  @ApiTooManyRequestsResponse({ description: 'Per-client booking creation limit exceeded' })
  create(@Body() dto: CreatePublicRoomBookingDto, @Headers('idempotency-key') idempotencyKey: string | undefined, @Headers(CORRELATION_ID_HEADER) correlationId: string | undefined, @Req() request: Request) {
    this.rateLimit.check(request.ip);
    return this.bookings.create(dto, idempotencyKey ?? '', { correlationId, ipAddress: request.ip, userAgent: request.get('user-agent') });
  }
}
