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
import { CreateBbqReservationDto, TransitionBbqReservationDto } from './dto/bbq-reservation.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { BbqReservationCreationService } from './bbq-reservation-creation.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { AdminBbqReservationsService } from './admin-bbq-reservations.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('BBQ reservations')
@ApiBearerAuth()
@Controller('admin/bbq/reservations')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('bbq.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks bbq.manage' })
export class AdminBbqReservationController {
  constructor(
    private readonly creation: BbqReservationCreationService,
    private readonly reservations: AdminBbqReservationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a BBQ table reservation (hold, deposit snapshot, optional pre-ordered items)' })
  create(@Body() dto: CreateBbqReservationDto) {
    return this.creation.create({
      customerId: dto.customerId,
      tableId: dto.tableId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      adults: dto.adults,
      children: dto.children ?? 0,
      items: dto.items ?? [],
      specialRequest: dto.specialRequest,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Get('calendar')
  @ApiOperation({ summary: 'BBQ reservations for one operational date (front-desk/calendar view)' })
  calendar(@Query('date') date?: string) {
    return this.reservations.calendar(operationalDate(date));
  }

  @Get()
  @ApiOperation({ summary: 'List BBQ reservations with status and date filters' })
  list(
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.reservations.list({
      status: status?.trim() || undefined,
      reservationDateFrom: parseDate(dateFrom),
      reservationDateTo: parseDate(dateTo),
      page: bounded(page, 1, 1, 1_000_000),
      pageSize: bounded(pageSize, 50, 1, 100),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one BBQ reservation with tables, items and status history' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservations.detail(id);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a BBQ reservation' })
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionBbqReservationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reservations.transition(request.actor!, id, 'CONFIRMED', dto.reason, correlationId(request));
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a BBQ reservation and release its table hold' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionBbqReservationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reservations.transition(request.actor!, id, 'CANCELLED', dto.reason, correlationId(request));
  }

  @Post(':id/check-in')
  @ApiOperation({ summary: 'Check a confirmed BBQ reservation in' })
  checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionBbqReservationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reservations.transition(request.actor!, id, 'CHECKED_IN', dto.reason, correlationId(request));
  }

  @Post(':id/check-out')
  @ApiOperation({ summary: 'Check a checked-in BBQ reservation out' })
  checkOut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionBbqReservationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reservations.transition(request.actor!, id, 'CHECKED_OUT', dto.reason, correlationId(request));
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

/** Accepts a plain `YYYY-MM-DD` date; anything else is ignored. */
function parseDate(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Same convention as the room front desk: keyed by the Asia/Ho_Chi_Minh operational day, defaulting to today when no date is given. */
function operationalDate(value: string | undefined): Date {
  const parsed = parseDate(value);
  if (parsed) return parsed;
  const nowInHoChiMinh = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return new Date(`${nowInHoChiMinh.toISOString().slice(0, 10)}T00:00:00.000Z`);
}
