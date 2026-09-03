import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export type SePayProvider = 'SEPAY' | 'SEPAY_TEST';
export interface SePayWebhookConfig { apiKey: string; provider: SePayProvider; mode: 'production' | 'sandbox'; }
export interface SePayPaymentConfig extends SePayWebhookConfig { bankAccountNumber: string; bankCode: string; bankAccountName: string; qrBaseUrl: string; }

@Injectable()
export class SePayWebhookConfigService {
  get(): SePayWebhookConfig {
    const mode = this.mode();
    const apiKey = required('SEPAY_API_KEY');
    if (mode === 'production' && process.env['SEPAY_WEBHOOK_AUTH_TYPE']?.trim().toLowerCase() !== 'api_key') unavailable();
    return { apiKey, mode, provider: mode === 'production' ? 'SEPAY' : 'SEPAY_TEST' };
  }

  getPayment(): SePayPaymentConfig {
    const webhook = this.get();
    if (webhook.mode === 'sandbox') return { ...webhook, bankAccountNumber: '', bankCode: '', bankAccountName: '', qrBaseUrl: '' };
    return {
      ...webhook,
      bankAccountNumber: required('SEPAY_BANK_ACCOUNT_NUMBER', /^[0-9]{6,30}$/),
      bankCode: required('SEPAY_BANK_CODE', /^[A-Za-z0-9_-]{2,32}$/),
      bankAccountName: required('SEPAY_ACCOUNT_NAME', /^.{1,150}$/),
      qrBaseUrl: required('SEPAY_QR_BASE_URL', /^https:\/\//),
    };
  }

  private mode(): 'production' | 'sandbox' {
    const appEnvironment = process.env['APP_ENV'] ?? process.env['NODE_ENV'] ?? 'development';
    const configured = process.env['SEPAY_ENV']?.trim().toLowerCase();
    if (appEnvironment === 'production') {
      if (configured !== 'production') unavailable();
      return 'production';
    }
    if (!configured || configured === 'sandbox' || configured === 'test') return 'sandbox';
    if (configured === 'production') return 'production';
    unavailable();
  }
}

function required(name: string, pattern?: RegExp): string {
  const value = process.env[name]?.trim();
  if (!value || value.length > 512 || (pattern && !pattern.test(value))) unavailable();
  return value;
}

function unavailable(): never {
  throw new ServiceUnavailableException({ code: 'SEPAY_WEBHOOK_UNAVAILABLE', message: 'SePay webhook is currently unavailable' });
}
