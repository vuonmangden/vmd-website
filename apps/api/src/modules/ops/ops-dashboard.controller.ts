import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { OpsDashboardService } from './ops-dashboard.service';

@ApiTags('Ops dashboard')
@ApiBearerAuth()
@Controller('admin/ops/dashboard')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks report access' })
export class OpsDashboardController {
  constructor(private readonly dashboard: OpsDashboardService) {}

  @Get()
  @RequirePermissions('report.read')
  @ApiOperation({ summary: 'Aggregate operational counters for one operational day' })
  summary(@Query('date') date?: string) {
    return this.dashboard.summary(operationalDate(date));
  }
}

/** Same convention as the room front desk and BBQ calendar: keyed by the Asia/Ho_Chi_Minh operational day, defaulting to today when no date is given. */
function operationalDate(value: string | undefined): Date {
  const parsed = parseDate(value);
  if (parsed) return parsed;
  const nowInHoChiMinh = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return new Date(`${nowInHoChiMinh.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
