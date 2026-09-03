import { SePayWebhookConfigService } from './sepay-webhook.config';

describe('SePayWebhookConfigService', () => {
  const original = { ...process.env };
  afterEach(() => { process.env = { ...original }; });

  it('permits a configured Test Mode key outside production', () => {
    process.env = { ...original, APP_ENV: 'staging', SEPAY_API_KEY: 'sandbox-key' };
    expect(new SePayWebhookConfigService().get()).toEqual({ apiKey: 'sandbox-key', mode: 'sandbox', provider: 'SEPAY_TEST' });
  });

  it('fails closed for production until the explicitly configured production mode, bank and QR contract are complete', () => {
    process.env = { ...original, APP_ENV: 'production', SEPAY_API_KEY: 'production-key' };
    expect(() => new SePayWebhookConfigService().get()).toThrow('SePay webhook is currently unavailable');
    process.env = { ...original, APP_ENV: 'production', SEPAY_ENV: 'production', SEPAY_API_KEY: 'production-key', SEPAY_WEBHOOK_AUTH_TYPE: 'api_key' };
    expect(() => new SePayWebhookConfigService().getPayment()).toThrow('SePay webhook is currently unavailable');
  });

  it('permits a complete production configuration and does not confuse it with sandbox', () => {
    process.env = {
      ...original, APP_ENV: 'production', SEPAY_ENV: 'production', SEPAY_WEBHOOK_AUTH_TYPE: 'api_key', SEPAY_API_KEY: 'production-key',
      SEPAY_BANK_ACCOUNT_NUMBER: '1234567890', SEPAY_BANK_CODE: 'MB', SEPAY_ACCOUNT_NAME: 'VUON MANG DEN', SEPAY_QR_BASE_URL: 'https://vietqr.app/img',
    };
    expect(new SePayWebhookConfigService().getPayment()).toEqual(expect.objectContaining({ mode: 'production', provider: 'SEPAY', bankAccountNumber: '1234567890' }));
  });

  it('fails closed when production has a key but SePay is not configured for the supported API Key webhook mode', () => {
    process.env = { ...original, APP_ENV: 'production', SEPAY_ENV: 'production', SEPAY_WEBHOOK_AUTH_TYPE: 'hmac', SEPAY_API_KEY: 'production-key' };
    expect(() => new SePayWebhookConfigService().get()).toThrow('SePay webhook is currently unavailable');
  });
});
