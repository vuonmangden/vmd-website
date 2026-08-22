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
import { OpsCalendarService } from './ops-calendar.service';

/** Generous enough for a month view plus lead-in/lead-out days; still bounded. */
const MAX_RANGE_DAYS = 100;

@ApiTags('Ops calendar')
@ApiBearerAuth()
@Controller('admin/ops/calendar')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks booking access' })
export class OpsCalendarController {
  constructor(private readonly calendar: OpsCalendarService) {}

  @Get()
  @RequirePermissions('booking.read')
  @ApiOperation({ summary: 'Room and BBQ placements for a date range, for day/week/month/by-room calendar views' })
  range(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('roomId') roomId?: string,
  ) {
    const parsedFrom = parseDate(from);
    const parsedTo = parseDate(to);
    if (!parsedFrom || !parsedTo || parsedTo <= parsedFrom) {
      throw new BadRequestException({
        code: 'CALENDAR_RANGE_INVALID',
        message: 'from and to must be valid dates with from before to',
      });
    }

    const spanDays = (parsedTo.getTime() - parsedFrom.getTime()) / (24 * 60 * 60 * 1000);
    if (spanDays > MAX_RANGE_DAYS) {
      throw new BadRequestException({
        code: 'CALENDAR_RANGE_TOO_WIDE',
        message: `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
      });
    }

    if (roomId !== undefined && !isUuid(roomId)) {
      throw new BadRequestException({ code: 'ROOM_ID_INVALID', message: 'roomId must be a UUID' });
    }

    return this.calendar.range({ from: parsedFrom, to: parsedTo, roomId });
  }
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
