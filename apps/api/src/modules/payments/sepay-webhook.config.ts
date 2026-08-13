import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface SePayWebhookConfig { apiKey: string; }

@Injectable()
export class SePayWebhookConfigService {
  get(): SePayWebhookConfig {
    const environment = process.env['APP_ENV'] ?? process.env['NODE_ENV'] ?? 'development';
    const apiKey = process.env['SEPAY_API_KEY']?.trim();
    if (environment === 'production' || !apiKey || apiKey.length > 512) {
      throw new ServiceUnavailableException({ code: 'SEPAY_WEBHOOK_UNAVAILABLE', message: 'SePay webhook is currently unavailable' });
    }
    return { apiKey };
  }
}
