import { ResendEmailProvider } from './resend-email.provider';
import type { NotificationMessage } from './notification-provider';

const MESSAGE: NotificationMessage = {
  to: 'guest@example.com',
  subject: 'Xác nhận đặt phòng',
  html: '<p>Xin chào</p>',
  text: 'Xin chào',
};

describe('ResendEmailProvider', () => {
  let provider: ResendEmailProvider;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    provider = new ResendEmailProvider();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env['RESEND_API_KEY'] = 'test-key';
    process.env['NOTIFICATION_FROM_EMAIL'] = 'noreply@example.com';
  });

  afterEach(() => {
    delete process.env['RESEND_API_KEY'];
    delete process.env['NOTIFICATION_FROM_EMAIL'];
    jest.restoreAllMocks();
  });

  it('fails when the API key is missing', async () => {
    delete process.env['RESEND_API_KEY'];

    const result = await provider.send(MESSAGE);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email provider is not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails when the from address is missing', async () => {
    delete process.env['NOTIFICATION_FROM_EMAIL'];

    const result = await provider.send(MESSAGE);

    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the provider message id on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'resend-123' }),
    });

    const result = await provider.send(MESSAGE);

    expect(result).toEqual({
      success: true,
      provider: 'resend',
      providerMessageId: 'resend-123',
    });
  });

  it('sends both html and plain-text bodies', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'resend-123' }),
    });

    await provider.send(MESSAGE);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.html).toBe('<p>Xin chào</p>');
    expect(body.text).toBe('Xin chào');
    expect(body.to).toEqual(['guest@example.com']);
  });

  it('forwards the deduplication key as an idempotency header', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'resend-123' }),
    });

    await provider.send({
      ...MESSAGE,
      deduplicationKey: 'booking:abc:confirmed:email',
    });

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['Idempotency-Key']).toBe('booking:abc:confirmed:email');
  });

  it('omits the idempotency header when no key is given', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'resend-123' }),
    });

    await provider.send(MESSAGE);

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['Idempotency-Key']).toBeUndefined();
  });

  it('reports the provider error message on a rejected send', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: 'Invalid recipient' }),
    });

    const result = await provider.send(MESSAGE);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid recipient');
  });

  it('falls back to the status code when the error body is unreadable', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    });

    const result = await provider.send(MESSAGE);

    expect(result.success).toBe(false);
    expect(result.error).toBe('HTTP 500');
  });

  it('does not throw when the request fails', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const result = await provider.send(MESSAGE);

    expect(result.success).toBe(false);
    expect(result.error).toBe('network down');
  });

  it('never logs the recipient address', async () => {
    const errorSpy = jest
      .spyOn(provider['logger'], 'error')
      .mockImplementation(() => undefined);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: 'Invalid recipient' }),
    });

    await provider.send(MESSAGE);

    const logged = errorSpy.mock.calls.map((call) => String(call[0])).join(' ');
    expect(logged).not.toContain('guest@example.com');
  });
});
