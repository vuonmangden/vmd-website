import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  NotificationMessage,
  NotificationProvider,
  NotificationResult,
} from './notification-provider';

/**
 * Local and test adapter. Records that a send was requested without
 * contacting an external service. Never selected when NODE_ENV is
 * production — see createEmailProvider.
 */
@Injectable()
export class LogEmailProvider implements NotificationProvider {
  private readonly logger = new Logger(LogEmailProvider.name);
  readonly name = 'log';

  send(message: NotificationMessage): Promise<NotificationResult> {
    // Subject only: §35.5 forbids logging full recipient addresses.
    this.logger.log(
      `Email suppressed in local mode. subject="${message.subject}"`,
    );

    return Promise.resolve({
      success: true,
      provider: this.name,
      providerMessageId: `log-${randomUUID()}`,
    });
  }
}
