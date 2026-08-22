import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { ReportsService } from './reports.service';
import type { ReportRange } from './reports.service';

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
