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
import { CheckInOutDto } from './dto/check-in-out.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { CheckInOutService } from './check-in-out.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('Front desk')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks the required booking permission' })
export class CheckInOutController {
  constructor(private readonly frontDesk: CheckInOutService) {}

  @Get('front-desk/movements')
  @RequirePermissions('booking.read')
  @ApiOperation({ summary: 'Arrivals and departures for one operational date' })
  movements(@Query('date') date?: string) {
    return this.frontDesk.dailyMovements(operationalDate(date));
  }

  @Post('bookings/:id/check-in')
  @RequirePermissions('booking.checkin')
  @ApiOperation({ summary: 'Check a confirmed booking in' })
  checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckInOutDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.frontDesk.checkIn(request.actor!, id, dto.note, correlationId(request));
  }

  @Post('bookings/:id/check-out')
  @RequirePermissions('booking.checkout')
  @ApiOperation({ summary: 'Check a checked-in booking out' })
  checkOut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckInOutDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.frontDesk.checkOut(request.actor!, id, dto.note, correlationId(request));
  }
}

function correlationId(request: AuthenticatedRequest): string {
  const value = request.headers[CORRELATION_ID_HEADER];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

/**
 * Bookings store plain dates, so the worklist is keyed by the
 * Asia/Ho_Chi_Minh operational day rather than a UTC instant.
 */
function operationalDate(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const nowInHoChiMinh = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return new Date(`${nowInHoChiMinh.toISOString().slice(0, 10)}T00:00:00.000Z`);
}
