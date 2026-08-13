import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../../common/queues/queue.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SePayWebhookConfigService } from './sepay-webhook.config';
import { SePayWebhookController } from './sepay-webhook.controller';
import { SePayWebhookService } from './sepay-webhook.service';

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [PaymentsController, SePayWebhookController],
  providers: [PaymentsService, SePayWebhookConfigService, SePayWebhookService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
