import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
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
import { NotificationInboxService } from './notification-inbox.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('Notification inbox')
@ApiBearerAuth()
@Controller('admin/notification-jobs')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks the required permission' })
export class NotificationInboxController {
  constructor(private readonly inbox: NotificationInboxService) {}

  @Get()
  @RequirePermissions('report.read')
  @ApiOperation({ summary: 'List failed notification jobs; recipients are masked' })
  list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.inbox.list({
      status: status?.trim() || undefined,
      page: bounded(page, 1, 1, 1_000_000),
      pageSize: bounded(pageSize, 50, 1, 100),
    });
  }

  @Post(':id/retry')
  @RequirePermissions('content.manage')
  @ApiOperation({ summary: 'Requeue a failed notification job' })
  retry(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.inbox.retry(request.actor!, id, correlationId(request));
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
