import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { AdminPaymentsService } from './admin-payments.service';

@ApiTags('Admin payments')
@ApiBearerAuth()
@Controller('admin/payments')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('payment.read')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks payment.read' })
export class AdminPaymentsController {
  constructor(private readonly payments: AdminPaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List payment intents with status and booking filters' })
  list(
    @Query('status') status?: string,
    @Query('bookingId') bookingId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.payments.list({
      status: status?.trim() || undefined,
      bookingId: bookingId?.trim() || undefined,
      page: bounded(page, 1, 1, 1_000_000),
      pageSize: bounded(pageSize, 50, 1, 100),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one payment intent with its full reconciliation case history' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.detail(id);
  }
}

function bounded(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}
