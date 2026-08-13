import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../../common/interceptors/correlation-id.interceptor';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata.
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PaymentsService } from './payments.service';

@ApiTags('Sandbox payments') @ApiBearerAuth() @Controller('admin/sandbox/payment-intents') @UseGuards(AdminAuthGuard, PermissionsGuard) @RequirePermissions('payment.read')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks payment.read' })
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Post() @ApiOperation({ summary: 'Create a synthetic booking payment intent; no real bank details or payment confirmation' })
  create(@Body() dto: CreatePaymentIntentDto, @Req() request: AuthenticatedRequest, @Headers(CORRELATION_ID_HEADER) correlationId?: string) {
    const actor = request.actor!;
    return this.payments.createSandboxIntent(dto.bookingId, dto.idempotencyKey, { staffProfileId: actor.staffProfileId, correlationId, ipAddress: request.ip, userAgent: request.get('user-agent') });
  }
  @Get(':id') @ApiOperation({ summary: 'Read a synthetic payment intent' })
  get(@Param('id') id: string, @Req() request: Request) { void request; return this.payments.getSandboxIntent(id); }
}
