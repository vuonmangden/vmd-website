import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../../common/queues/queue.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SePayWebhookConfigService } from './sepay-webhook.config';
import { SePayWebhookController } from './sepay-webhook.controller';
import { SePayWebhookService } from './sepay-webhook.service';
import { PaymentWebhookProcessor } from './payment-webhook.processor';
import { PaymentProcessingService } from './payment-processing.service';
import { PublicPaymentStatusController } from './public-payment-status.controller';
import { PublicPaymentStatusRateLimitService } from './public-payment-status-rate-limit.service';

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [PaymentsController, SePayWebhookController, PublicPaymentStatusController],
  providers: [PaymentsService, SePayWebhookConfigService, SePayWebhookService, PaymentProcessingService, PaymentWebhookProcessor, PublicPaymentStatusRateLimitService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
