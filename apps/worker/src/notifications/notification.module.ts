import { Module } from '@nestjs/common';
import { EMAIL_PROVIDER } from './notification-provider';
import { createEmailProvider } from './email-provider.factory';

@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: () =>
        createEmailProvider(
          process.env['EMAIL_PROVIDER'],
          process.env['NODE_ENV'],
        ),
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class NotificationModule {}
