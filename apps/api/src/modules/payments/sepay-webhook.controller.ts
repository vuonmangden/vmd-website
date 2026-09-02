import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CORRELATION_ID_HEADER } from '../../common/interceptors/correlation-id.interceptor';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata.
import { SePayWebhookDto } from './dto/sepay-webhook.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { SePayWebhookService } from './sepay-webhook.service';

@ApiTags('SePay webhook')
@Controller('webhooks/sepay')
export class SePayWebhookController {
  constructor(private readonly webhook: SePayWebhookService) {}

  @Post('transactions')
  @ApiOperation({ summary: 'Ingest an authenticated SePay transaction webhook; processing is deferred' })
  @ApiHeader({ name: 'Authorization', required: true, description: 'Apikey <SEPAY_API_KEY>' })
  @ApiResponse({ status: 201, description: 'Event stored and queued, or duplicate safely acknowledged' })
  @ApiUnauthorizedResponse({ description: 'Invalid webhook API key' })
  receive(@Body() payload: SePayWebhookDto, @Headers('authorization') authorization?: string, @Headers(CORRELATION_ID_HEADER) correlationId?: string) {
    return this.webhook.receive(payload, authorization, correlationId);
  }
}
