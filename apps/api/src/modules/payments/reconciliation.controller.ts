import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CORRELATION_ID_HEADER } from '../../common/interceptors/correlation-id.interceptor';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { ListReconciliationCasesQueryDto, ResolveReconciliationCaseDto } from './dto/resolve-reconciliation-case.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { ReconciliationService } from './reconciliation.service';

@ApiTags('Payment reconciliation')
@ApiBearerAuth()
@Controller('admin/payments/reconciliation-cases')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('payment.reconcile')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks payment.reconcile' })
export class ReconciliationController {
  constructor(private readonly reconciliation: ReconciliationService) {}

  @Get()
  @ApiOperation({ summary: 'List reconciliation cases (underpayment, overpayment, late/expired transfers)' })
  list(@Query() query: ListReconciliationCasesQueryDto) {
    return this.reconciliation.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reconciliation case with its payment intent context' })
  get(@Param('id') id: string) {
    return this.reconciliation.findById(id);
  }

  @Post(':id/resolve')
  @ApiOperation({
    summary: 'Record a manual resolution (refund or restore) — no money movement or booking change is performed by this endpoint',
  })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveReconciliationCaseDto,
    @Req() request: AuthenticatedRequest,
    @Headers(CORRELATION_ID_HEADER) correlationId?: string,
  ) {
    return this.reconciliation.resolve(request.actor!, id, dto.outcome, dto.note, correlationId);
  }
}
