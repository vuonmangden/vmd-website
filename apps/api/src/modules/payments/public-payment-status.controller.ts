import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PaymentProcessingService } from './payment-processing.service';

@ApiTags('Public sandbox payments')
@Controller('public/payment-status')
export class PublicPaymentStatusController {
  constructor(private readonly processing: PaymentProcessingService) {}

  @Get(':paymentIntentId')
  @ApiOperation({ summary: 'Read the safe, low-information status of a sandbox payment intent' })
  @ApiNotFoundResponse({ description: 'Payment intent does not exist' })
  get(@Param('paymentIntentId') paymentIntentId: string) { return this.processing.publicStatus(paymentIntentId); }
}
