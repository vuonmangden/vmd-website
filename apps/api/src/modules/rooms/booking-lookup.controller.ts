import { Body, Controller, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../../common/interceptors/correlation-id.interceptor';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { BookingLookupService } from './booking-lookup.service';
import type { BookingLookupDto, PublicGuestRequestDto, DecideGuestRequestDto, ReviewGuestRequestDto } from './dto/booking-lookup.dto';

@ApiTags('Public booking lookup') @Controller('public/booking-lookup')
export class BookingLookupController {
  constructor(private readonly lookup: BookingLookupService) {}
  @Post() lookupBooking(@Body() dto: BookingLookupDto, @Req() request: Request) { return this.lookup.lookup(dto.bookingCode, dto.phone, request.ip ?? 'unknown'); }
  @Post('requests') createRequest(@Body() dto: PublicGuestRequestDto, @Req() request: Request, @Headers(CORRELATION_ID_HEADER) correlationId?: string) { return this.lookup.createGuestRequest(dto.bookingCode, dto.phone, dto, request.ip ?? 'unknown', { correlationId, userAgent: request.get('user-agent') }); }
  @Post('printable') printable(@Body() dto: BookingLookupDto, @Req() request: Request) { return this.lookup.printable(dto.bookingCode, dto.phone, request.ip ?? 'unknown'); }
}

@ApiTags('Booking guest requests') @ApiBearerAuth() @Controller('admin/booking-guest-requests') @UseGuards(AdminAuthGuard, PermissionsGuard)
export class BookingGuestRequestsController {
  constructor(private readonly lookup: BookingLookupService) {}
  @Post(':requestId/review') @RequirePermissions('booking.update') review(@Param('requestId') requestId: string, @Body() dto: ReviewGuestRequestDto, @Req() request: AuthenticatedRequest, @Headers(CORRELATION_ID_HEADER) correlationId?: string) { return this.lookup.review(requestId, dto.note, request.actor!, correlationId); }
  @Post(':requestId/decision') @RequirePermissions('booking.cancel') decide(@Param('requestId') requestId: string, @Body() dto: DecideGuestRequestDto, @Req() request: AuthenticatedRequest, @Headers(CORRELATION_ID_HEADER) correlationId?: string) { return this.lookup.decide(requestId, dto.decision, dto.note, dto.policy, request.actor!, correlationId); }
}
