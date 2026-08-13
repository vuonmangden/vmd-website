import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PaymentProcessingService } from './payment-processing.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PublicPaymentStatusRateLimitService } from './public-payment-status-rate-limit.service';

@ApiTags('Public sandbox payments')
@Controller('public/payment-status')
export class PublicPaymentStatusController {
  constructor(
    private readonly processing: PaymentProcessingService,
    private readonly rateLimit: PublicPaymentStatusRateLimitService,
  ) {}

  @Get(':paymentIntentId')
  @ApiOperation({ summary: 'Read the safe, low-information status of a sandbox payment intent' })
  @ApiNotFoundResponse({ description: 'Payment intent does not exist' })
  get(@Param('paymentIntentId', new ParseUUIDPipe({ version: '4' })) paymentIntentId: string, @Req() request: Request) {
    this.rateLimit.check(request.ip);
    return this.processing.publicStatus(paymentIntentId);
  }
}
