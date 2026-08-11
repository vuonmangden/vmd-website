import { createServer } from 'node:net';
import type { AddressInfo, Server } from 'node:net';
import type { EmailConfiguration } from './email.configuration';
import { MailpitEmailProvider } from './mailpit-email.provider';
import type { EmailMessage } from './email.types';

const configuration: EmailConfiguration = {
  apiKey: null,
  fromAddress: 'noreply@vuonmangden.vn',
  fromName: 'Vườn Măng Đen',
  isProduction: false,
  mailpitHost: '127.0.0.1',
  mailpitPort: 1025,
  provider: 'mailpit',
  replyTo: 'info@vuonmangden.vn',
  resendApiUrl: 'https://api.resend.com',
  timeoutMs: 1_000,
};

const message: EmailMessage = {
  correlationId: 'mailpit-correlation-123',
  recipient: 'guest@example.test',
  subject: 'Synthetic subject',
  text: 'Synthetic body',
};

describe('MailpitEmailProvider', () => {
  let server: Server;
  let commands: string[];
  let messageLines: string[];

  beforeEach(async () => {
    commands = [];
    messageLines = [];
    server = createMailpitCompatibleServer(commands, messageLines);
    await listen(server);
  });

  afterEach(async () => {
    await close(server);
  });

  it('sends the technical recipient, subject, and body through local Mailpit SMTP only', async () => {
    const address = server.address() as AddressInfo;
    const provider = new MailpitEmailProvider({
      ...configuration,
      mailpitHost: '127.0.0.1',
      mailpitPort: address.port,
    });

    await expect(provider.send(message)).resolves.toEqual({
      provider: 'mailpit',
      providerMessageId: 'mailpit-correlation-123',
      status: 'sent',
    });
    expect(commands).toContain('RCPT TO:<guest@example.test>');
    expect(messageLines.join('\n')).toContain('Subject: Synthetic subject');
    expect(messageLines.join('\n')).toContain('Synthetic body');
  });
});

function createMailpitCompatibleServer(
  commands: string[],
  messageLines: string[],
): Server {
  return createServer((socket) => {
    let buffer = '';
    let receivingData = false;
    socket.write('220 local-mailpit.test ESMTP\r\n');

    socket.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (receivingData) {
          if (line === '.') {
            receivingData = false;
            socket.write('250 2.0.0 accepted\r\n');
          } else {
            messageLines.push(line);
          }
          continue;
        }

        commands.push(line);
        if (line === 'DATA') {
          receivingData = true;
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (line === 'QUIT') {
          socket.end('221 2.0.0 bye\r\n');
        } else {
          socket.write('250 2.0.0 ok\r\n');
        }
      }
    });
  });
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
