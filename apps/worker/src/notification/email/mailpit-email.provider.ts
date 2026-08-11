import { createConnection } from 'node:net';
import type { Socket } from 'node:net';
import {
  EmailDeliveryError,
  type EmailDeliveryResult,
  type EmailMessage,
  type EmailProvider,
} from './email.types';
import type { EmailConfiguration } from './email.configuration';

interface SmtpResponse {
  code: number;
  message: string;
}

interface SmtpSession {
  close(): void;
  command(value: string): Promise<SmtpResponse>;
}

type SmtpSessionFactory = (
  configuration: EmailConfiguration,
) => Promise<SmtpSession>;

export class MailpitEmailProvider implements EmailProvider {
  constructor(
    private readonly configuration: EmailConfiguration,
    private readonly sessionFactory: SmtpSessionFactory = createSmtpSession,
  ) {}

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    let session: SmtpSession | null = null;

    try {
      session = await this.sessionFactory(this.configuration);
      await expectResponse(session.command('EHLO vmd-worker'), 250);
      await expectResponse(
        session.command(`MAIL FROM:<${this.configuration.fromAddress}>`),
        250,
      );
      await expectResponse(session.command(`RCPT TO:<${message.recipient}>`), 250);
      await expectResponse(session.command('DATA'), 354);
      await expectResponse(session.command(formatMessage(message, this.configuration)), 250);
      await expectResponse(session.command('QUIT'), 221);

      return {
        provider: 'mailpit',
        providerMessageId: message.correlationId,
        status: 'sent',
      };
    } catch (error) {
      if (error instanceof EmailDeliveryError) throw error;
      if (isTimeout(error)) {
        throw new EmailDeliveryError('timeout', true, 'mailpit');
      }

      throw new EmailDeliveryError('provider_unavailable', true, 'mailpit');
    } finally {
      session?.close();
    }
  }
}

async function expectResponse(
  operation: Promise<SmtpResponse>,
  expectedCode: number,
): Promise<void> {
  const response = await operation;
  if (response.code !== expectedCode) {
    throw new EmailDeliveryError(
      response.code >= 400 && response.code < 500
        ? 'provider_unavailable'
        : 'rejected',
      response.code >= 400 && response.code < 500,
      'mailpit',
    );
  }
}

function formatMessage(message: EmailMessage, configuration: EmailConfiguration): string {
  validateMessage(message);

  if (message.html) {
    const boundary = `vmd-${message.correlationId.replace(/[^a-zA-Z0-9]/gu, '')}`;
    return [
      `From: ${configuration.fromName} <${configuration.fromAddress}>`,
      `To: ${message.recipient}`,
      `Reply-To: ${configuration.replyTo}`,
      `Subject: ${message.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      normalizeBody(message.text),
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      normalizeBody(message.html),
      `--${boundary}--`,
      '.',
    ].join('\r\n');
  }

  return [
    `From: ${configuration.fromName} <${configuration.fromAddress}>`,
    `To: ${message.recipient}`,
    `Reply-To: ${configuration.replyTo}`,
    `Subject: ${message.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    normalizeBody(message.text),
    '.',
  ].join('\r\n');
}

function normalizeBody(value: string): string {
  return value.replace(/\r?\n/g, '\r\n').replace(/^\./gmu, '..');
}

function validateMessage(message: EmailMessage): void {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
  if (
    !emailPattern.test(message.recipient) ||
    !message.subject.trim() ||
    /[\r\n]/u.test(message.subject)
  ) {
    throw new EmailDeliveryError('rejected', false, 'mailpit');
  }
}

function createSmtpSession(
  configuration: EmailConfiguration,
): Promise<SmtpSession> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({
      host: configuration.mailpitHost,
      port: configuration.mailpitPort,
    });
    const reader = new SmtpResponseReader(socket, configuration.timeoutMs);
    const timeout = setTimeout(() => {
      socket.destroy(new DOMException('SMTP connection timed out', 'TimeoutError'));
    }, configuration.timeoutMs);

    socket.once('error', reject);
    socket.once('connect', () => {
      clearTimeout(timeout);
      void reader.next()
        .then((greeting) => {
          if (greeting.code !== 220) {
            throw new EmailDeliveryError('provider_unavailable', true, 'mailpit');
          }
          resolve({
            close: () => socket.destroy(),
            command: async (value) => {
              socket.write(`${value}\r\n`);
              return reader.next();
            },
          });
        })
        .catch(reject);
    });
  });
}

class SmtpResponseReader {
  private buffer = '';
  private readonly responses: SmtpResponse[] = [];
  private readonly waiters: Array<{
    reject: (error: Error) => void;
    resolve: (response: SmtpResponse) => void;
  }> = [];

  constructor(
    private readonly socket: Socket,
    private readonly timeoutMs: number,
  ) {
    socket.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString('utf8');
      this.consume();
    });
    socket.on('error', (error: Error) => this.rejectAll(error));
    socket.on('close', () => {
      this.rejectAll(new Error('SMTP connection closed'));
    });
  }

  next(): Promise<SmtpResponse> {
    const existing = this.responses.shift();
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const waiter: {
        reject: (error: Error) => void;
        resolve: (response: SmtpResponse) => void;
      } = {
        resolve: (response: SmtpResponse) => {
          clearTimeout(timer);
          resolve(response);
        },
        reject: (error: Error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      const timer = setTimeout(() => {
        this.removeWaiter(waiter);
        reject(new DOMException('SMTP response timed out', 'TimeoutError'));
      }, this.timeoutMs);
      this.waiters.push(waiter);
    });
  }

  private consume(): void {
    const lines = this.buffer.split('\r\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const match = /^(\d{3})[ -](.*)$/u.exec(line);
      if (!match || line[3] === '-') continue;

      const response = {
        code: Number.parseInt(match[1] ?? '0', 10),
        message: match[2] ?? '',
      };
      const waiter = this.waiters.shift();
      if (waiter) waiter.resolve(response);
      else this.responses.push(response);
    }
  }

  private rejectAll(error: Error): void {
    while (this.waiters.length > 0) this.waiters.shift()?.reject(error);
  }

  private removeWaiter(waiter: {
    reject: (error: Error) => void;
    resolve: (response: SmtpResponse) => void;
  }): void {
    const index = this.waiters.indexOf(waiter);
    if (index >= 0) this.waiters.splice(index, 1);
  }
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}
