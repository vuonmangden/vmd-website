import { createEmailProvider } from './email-provider.factory';
import { ResendEmailProvider } from './resend-email.provider';
import { LogEmailProvider } from './log-email.provider';

describe('createEmailProvider', () => {
  it('returns the Resend adapter when selected', () => {
    expect(createEmailProvider('resend', 'development')).toBeInstanceOf(
      ResendEmailProvider,
    );
  });

  it('returns the Resend adapter in production', () => {
    expect(createEmailProvider('resend', 'production')).toBeInstanceOf(
      ResendEmailProvider,
    );
  });

  it('returns the log adapter outside production', () => {
    expect(createEmailProvider(undefined, 'development')).toBeInstanceOf(
      LogEmailProvider,
    );
    expect(createEmailProvider('log', 'test')).toBeInstanceOf(LogEmailProvider);
  });

  it('refuses to fall back to the log adapter in production', () => {
    expect(() => createEmailProvider(undefined, 'production')).toThrow(
      /EMAIL_PROVIDER must be/,
    );
    expect(() => createEmailProvider('log', 'production')).toThrow(
      /EMAIL_PROVIDER must be/,
    );
  });
});

describe('LogEmailProvider', () => {
  it('reports success without contacting a network service', async () => {
    const provider = new LogEmailProvider();
    jest.spyOn(provider['logger'], 'log').mockImplementation(() => undefined);

    const result = await provider.send({
      to: 'guest@example.com',
      subject: 'Xác nhận đặt phòng',
      html: '<p>Xin chào</p>',
      text: 'Xin chào',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('log');
    expect(result.providerMessageId).toMatch(/^log-/);
  });

  it('never logs the recipient address', async () => {
    const provider = new LogEmailProvider();
    const logSpy = jest
      .spyOn(provider['logger'], 'log')
      .mockImplementation(() => undefined);

    await provider.send({
      to: 'guest@example.com',
      subject: 'Xác nhận đặt phòng',
      html: '<p>Xin chào</p>',
      text: 'Xin chào',
    });

    const logged = logSpy.mock.calls.map((call) => String(call[0])).join(' ');
    expect(logged).not.toContain('guest@example.com');
  });
});
