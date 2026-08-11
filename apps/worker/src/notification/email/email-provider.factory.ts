import { Injectable } from '@nestjs/common';
import { loadEmailConfiguration } from './email.configuration';
import { MailpitEmailProvider } from './mailpit-email.provider';
import { ResendEmailProvider } from './resend-email.provider';
import type { EmailProvider } from './email.types';

@Injectable()
export class EmailProviderFactory {
  create(): EmailProvider {
    const configuration = loadEmailConfiguration();
    return configuration.provider === 'mailpit'
      ? new MailpitEmailProvider(configuration)
      : new ResendEmailProvider(configuration);
  }
}
