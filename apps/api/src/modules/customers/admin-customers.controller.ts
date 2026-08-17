import { Controller, Get, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
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
import { AdminCustomersService } from './admin-customers.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('Admin customers')
@ApiBearerAuth()
@Controller('admin/customers')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('booking.read')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks booking.read, or a role permitted to see full contact details' })
export class AdminCustomersController {
  constructor(private readonly customers: AdminCustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Search customers; contact details are masked' })
  list(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.customers.list({
      search: search?.trim() || undefined,
      page: bounded(page, 1, 1, 1_000_000),
      pageSize: bounded(pageSize, 50, 1, 100),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one customer with booking history; the access is audited' })
  detail(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.customers.detail(request.actor!, id, correlationId(request));
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
