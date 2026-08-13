import { SePayWebhookConfigService } from './sepay-webhook.config';

describe('SePayWebhookConfigService', () => {
  const original = { ...process.env };
  afterEach(() => { process.env = { ...original }; });

  it('permits a configured Test Mode key outside production', () => {
    process.env = { ...original, APP_ENV: 'staging', SEPAY_API_KEY: 'sandbox-key' };
    expect(new SePayWebhookConfigService().get()).toEqual({ apiKey: 'sandbox-key' });
  });

  it('fails closed for production even when a key exists', () => {
    process.env = { ...original, APP_ENV: 'production', SEPAY_API_KEY: 'sandbox-key' };
    expect(() => new SePayWebhookConfigService().get()).toThrow('SePay webhook is currently unavailable');
  });
});
