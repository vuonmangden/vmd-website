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

  it('fails closed for Resend in production even if a verification flag is supplied', () => {
    expect(() =>
      loadEmailConfiguration({
        ...approvedStagingConfiguration,
        APP_ENV: 'production',
        EMAIL_DOMAIN_VERIFIED: 'true',
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
