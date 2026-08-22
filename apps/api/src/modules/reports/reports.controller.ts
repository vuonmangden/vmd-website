import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
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
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { ReportsService } from './reports.service';
import type { ReportRange } from './reports.service';
import { REPORT_EXPORT_TYPES, type ReportExportType } from './report-csv';

const CORRELATION_ID_HEADER = 'x-correlation-id';

/** A year is generous for a reporting period and still bounded. */
const MAX_RANGE_DAYS = 366;

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('admin/reports')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('report.read')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks report.read' })
export class AdminReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('bookings')
  @ApiOperation({ summary: 'Booking volume by status and acquisition source for a date range' })
  bookings(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.bookings(range(from, to));
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue breakdown for a date range' })
  revenue(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.revenue(range(from, to));
  }

  @Get('occupancy')
  @ApiOperation({ summary: 'Daily room occupancy for a date range' })
  occupancy(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.occupancy(range(from, to));
  }

  @Get('bbq')
  @ApiOperation({ summary: 'BBQ reservation volume and revenue for a date range' })
  bbq(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.bbq(range(from, to));
  }

  @Get('payments')
  @ApiOperation({ summary: 'Payment intent and reconciliation case volume for a date range' })
  payments(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.payments(range(from, to));
  }

  @Get('export')
  @ApiOperation({ summary: 'CSV export of one report for a date range, audited' })
  export(
    @Query('type') type: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reports.export(actor(request), exportType(type), range(from, to), correlationId(request));
  }
}

function exportType(value: string | undefined): ReportExportType {
  if (value && (REPORT_EXPORT_TYPES as readonly string[]).includes(value)) {
    return value as ReportExportType;
  }
  throw new BadRequestException({
    code: 'REPORT_EXPORT_TYPE_INVALID',
    message: `type must be one of: ${REPORT_EXPORT_TYPES.join(', ')}`,
  });
}

function actor(request: AuthenticatedRequest) {
  if (!request.actor) throw new Error('Authenticated actor is missing from request');
  return request.actor;
}

function correlationId(request: AuthenticatedRequest): string {
  const value = request.headers[CORRELATION_ID_HEADER];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function range(from: string | undefined, to: string | undefined): ReportRange {
  const parsedFrom = parseDate(from);
  const parsedTo = parseDate(to);
  if (!parsedFrom || !parsedTo || parsedTo <= parsedFrom) {
    throw new BadRequestException({
      code: 'REPORT_RANGE_INVALID',
      message: 'from and to must be valid dates with from before to',
    });
  }

  const spanDays = (parsedTo.getTime() - parsedFrom.getTime()) / (24 * 60 * 60 * 1000);
  if (spanDays > MAX_RANGE_DAYS) {
    throw new BadRequestException({
      code: 'REPORT_RANGE_TOO_WIDE',
      message: `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
    });
  }

  return { from: parsedFrom, to: parsedTo };
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
