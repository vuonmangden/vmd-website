import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { CancelBookingDto, ConfirmBookingDto } from './dto/transition-booking.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { AdminBookingsService } from './admin-bookings.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('Admin bookings')
@ApiBearerAuth()
@Controller('admin/bookings')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks the required booking permission' })
export class AdminBookingsController {
  constructor(private readonly bookings: AdminBookingsService) {}

  @Get()
  @RequirePermissions('booking.read')
  @ApiOperation({ summary: 'List bookings with status and date filters' })
  list(
    @Query('status') status?: string,
    @Query('checkInFrom') checkInFrom?: string,
    @Query('checkInTo') checkInTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.bookings.list({
      status: status?.trim() || undefined,
      checkInFrom: parseDate(checkInFrom),
      checkInTo: parseDate(checkInTo),
      page: bounded(page, 1, 1, 1_000_000),
      pageSize: bounded(pageSize, 50, 1, 100),
    });
  }

  @Get(':id')
  @RequirePermissions('booking.read')
  @ApiOperation({ summary: 'Read one booking with its status history' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.detail(id);
  }

  @Post(':id/confirm')
  @RequirePermissions('booking.update')
  @ApiOperation({ summary: 'Confirm a booking' })
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmBookingDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.bookings.transition(
      request.actor!,
      id,
      'CONFIRMED',
      dto.reason,
      correlationId(request),
    );
  }

  @Post(':id/cancel')
  @RequirePermissions('booking.cancel')
  @ApiOperation({ summary: 'Cancel a booking and release its occupancy' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.bookings.transition(
      request.actor!,
      id,
      'CANCELLED',
      dto.reason,
      correlationId(request),
    );
  }
}

function correlationId(request: AuthenticatedRequest): string {
  const value = request.headers[CORRELATION_ID_HEADER];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function bounded(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

/** Accepts a plain `YYYY-MM-DD` operational date; anything else is ignored. */
function parseDate(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
