import type { EmailConfiguration } from './email.configuration';
import { ResendEmailProvider } from './resend-email.provider';
import type {
  EmailDeliveryError,
  EmailFailureCode,
  EmailMessage,
} from './email.types';

const configuration: EmailConfiguration = {
  apiKey: 'test-key',
  fromAddress: 'noreply@vuonmangden.vn',
  fromName: 'Vườn Măng Đen',
  isProduction: false,
  mailpitHost: '127.0.0.1',
  mailpitPort: 1025,
  provider: 'resend',
  replyTo: 'info@vuonmangden.vn',
  resendApiUrl: 'https://api.resend.com',
  timeoutMs: 50,
};

const message: EmailMessage = {
  correlationId: 'correlation-123',
  idempotencyKey: 'notification:correlation-123:email',
  recipient: 'guest@example.test',
  subject: 'Synthetic subject',
  text: 'Synthetic body',
};

type FetchMock = jest.Mock<
  Promise<Response>,
  [input: RequestInfo | URL, init?: RequestInit]
>;

const errorCases: ReadonlyArray<readonly [number, EmailFailureCode, boolean]> = [
  [401, 'authentication', false],
  [403, 'authentication', false],
  [429, 'rate_limited', true],
  [500, 'provider_unavailable', true],
  [503, 'provider_unavailable', true],
  [422, 'rejected', false],
];

describe('ResendEmailProvider', () => {
  it('returns a sent result and provider message id on success', async () => {
    const fetchImplementation: FetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-123' }), { status: 200 }),
    );
    const provider = new ResendEmailProvider(
      configuration,
      fetchImplementation as unknown as typeof fetch,
    );

    await expect(provider.send(message)).resolves.toEqual({
      provider: 'resend',
      providerMessageId: 'email-123',
      status: 'sent',
    });
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Idempotency-Key': 'notification:correlation-123:email',
        }),
      }),
    );
  });

  it.each(errorCases)('classifies HTTP %s without exposing response body', async (status, code, retryable) => {
    const provider = new ResendEmailProvider(
      configuration,
      (jest.fn().mockResolvedValue(
        new Response('sensitive body', { status }),
      ) as unknown as typeof fetch),
    );

    await expect(provider.send(message)).rejects.toMatchObject({
      code,
      provider: 'resend',
      retryable,
    } satisfies Partial<EmailDeliveryError>);
  });

  it('classifies an aborted request as retryable timeout', async () => {
    const provider = new ResendEmailProvider(
      configuration,
      (jest
        .fn()
        .mockRejectedValue(
          new DOMException('timeout', 'TimeoutError'),
        ) as unknown as typeof fetch),
    );

    await expect(provider.send(message)).rejects.toMatchObject({
      code: 'timeout',
      provider: 'resend',
      retryable: true,
    } satisfies Partial<EmailDeliveryError>);
  });

  it('retries only Resend\'s in-flight idempotency conflict', async () => {
    const concurrent = new ResendEmailProvider(
      configuration,
      (jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ name: 'concurrent_idempotent_requests' }), { status: 409 }),
      ) as unknown as typeof fetch),
    );
    const mismatched = new ResendEmailProvider(
      configuration,
      (jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ name: 'invalid_idempotent_request' }), { status: 409 }),
      ) as unknown as typeof fetch),
    );

    await expect(concurrent.send(message)).rejects.toMatchObject({ retryable: true });
    await expect(mismatched.send(message)).rejects.toMatchObject({ retryable: false });
  });
});
