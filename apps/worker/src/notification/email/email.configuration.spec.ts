import { EmailDeliveryError } from './email.types';
import { loadEmailConfiguration } from './email.configuration';

const approvedStagingConfiguration: NodeJS.ProcessEnv = {
  APP_ENV: 'staging',
  EMAIL_PROVIDER: 'resend',
  EMAIL_FROM_NAME: 'Vườn Măng Đen',
  EMAIL_FROM_ADDRESS: 'noreply@vuonmangden.com',
  EMAIL_REPLY_TO: 'info@vuonmangden.com',
  RESEND_API_KEY: 'test-key',
};

describe('loadEmailConfiguration', () => {
  it('loads the staging Resend path without leaking a secret', () => {
    const configuration = loadEmailConfiguration(approvedStagingConfiguration);

    expect(configuration.provider).toBe('resend');
    expect(configuration.isProduction).toBe(false);
    expect(configuration.resendApiUrl).toBe('https://api.resend.com');
  });

  it('allows Mailpit only outside production', () => {
    const configuration = loadEmailConfiguration({
      ...approvedStagingConfiguration,
      EMAIL_PROVIDER: 'mailpit',
      RESEND_API_KEY: undefined,
    });

    expect(configuration.mailpitHost).toBe('127.0.0.1');
    expect(configuration.mailpitPort).toBe(1025);
  });

  it('fails closed for Mailpit in production', () => {
    expect(() =>
      loadEmailConfiguration({
        ...approvedStagingConfiguration,
        APP_ENV: 'production',
        EMAIL_PROVIDER: 'mailpit',
        RESEND_API_KEY: undefined,
      }),
    ).toThrow(EmailDeliveryError);
  });

  /**
   * PRE-007's email item closed on 2026-09-03 (vuonmangden.com verified in
   * Resend), so production is reachable — but only through the same explicit
   * opt-in the SePay and storage contracts use. A stray flag is still not a
   * substitute for it.
   */
  it('fails closed in production when EMAIL_ENV does not also opt in', () => {
    expect(() =>
      loadEmailConfiguration({
        ...approvedStagingConfiguration,
        APP_ENV: 'production',
        EMAIL_DOMAIN_VERIFIED: 'true',
      }),
    ).toThrow(EmailDeliveryError);
  });

  it('sends through Resend in production once EMAIL_ENV opts in and the contract is complete', () => {
    const configuration = loadEmailConfiguration({
      ...approvedStagingConfiguration,
      APP_ENV: 'production',
      EMAIL_ENV: 'production',
    });

    expect(configuration.isProduction).toBe(true);
    expect(configuration.provider).toBe('resend');
    expect(configuration.resendApiUrl).toBe('https://api.resend.com');
  });

  it('still refuses Mailpit in production even with the opt-in', () => {
    expect(() =>
      loadEmailConfiguration({
        ...approvedStagingConfiguration,
        APP_ENV: 'production',
        EMAIL_ENV: 'production',
        EMAIL_PROVIDER: 'mailpit',
        RESEND_API_KEY: undefined,
      }),
    ).toThrow(EmailDeliveryError);
  });

  it('requires the Resend API key in production rather than sending unauthenticated', () => {
    expect(() =>
      loadEmailConfiguration({
        ...approvedStagingConfiguration,
        APP_ENV: 'production',
        EMAIL_ENV: 'production',
        RESEND_API_KEY: undefined,
      }),
    ).toThrow(EmailDeliveryError);
  });

  it('refuses a plaintext Resend endpoint in production', () => {
    expect(() =>
      loadEmailConfiguration({
        ...approvedStagingConfiguration,
        APP_ENV: 'production',
        EMAIL_ENV: 'production',
        RESEND_API_URL: 'http://api.resend.com',
      }),
    ).toThrow(EmailDeliveryError);
  });

  it('rejects an unsupported synthetic provider', () => {
    expect(() =>
      loadEmailConfiguration({
        ...approvedStagingConfiguration,
        EMAIL_PROVIDER: 'synthetic',
      }),
    ).toThrow(EmailDeliveryError);
  });
});
