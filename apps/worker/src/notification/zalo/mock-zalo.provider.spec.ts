import type { ZaloConfiguration } from './zalo.configuration';
import { MockZaloProvider } from './mock-zalo.provider';
import type {
  ZaloDeliveryError,
  ZaloFailureCode,
  ZaloMessage,
} from './zalo.types';

const configuration: ZaloConfiguration = {
  apiBaseUrl: 'http://127.0.0.1:4011',
  enabled: true,
  isProduction: false,
  provider: 'mock',
  timeoutMs: 50,
};

const message: ZaloMessage = {
  correlationId: 'zalo-correlation-123',
  recipientPhone: '0987654321',
  templateCode: 'BOOKING_CONFIRMED_ZALO',
  templateParams: { guestName: 'Nguyen Van A' },
};

type FetchMock = jest.Mock<
  Promise<Response>,
  [input: RequestInfo | URL, init?: RequestInit]
>;

const errorCases: ReadonlyArray<readonly [number, ZaloFailureCode, boolean]> = [
  [422, 'rejected', false],
  [429, 'rate_limited', true],
  [500, 'provider_unavailable', true],
  [503, 'provider_unavailable', true],
];

describe('MockZaloProvider', () => {
  it('sends to the local mock success endpoint and returns the message id', async () => {
    const fetchImplementation: FetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          provider: 'zalo-local-mock',
          status: 'success',
          messageId: 'zalo-local-message-0001',
        }),
        { status: 200 },
      ),
    );
    const provider = new MockZaloProvider(
      configuration,
      fetchImplementation as unknown as typeof fetch,
    );

    await expect(provider.send(message)).resolves.toEqual({
      provider: 'mock',
      providerMessageId: 'zalo-local-message-0001',
      status: 'sent',
    });
    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://127.0.0.1:4011/success',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it.each(errorCases)(
    'classifies HTTP %s without exposing response body',
    async (status, code, retryable) => {
      const provider = new MockZaloProvider(
        configuration,
        (jest
          .fn()
          .mockResolvedValue(
            new Response('sensitive body', { status }),
          ) as unknown as typeof fetch),
      );

      await expect(provider.send(message)).rejects.toMatchObject({
        code,
        provider: 'mock',
        retryable,
      } satisfies Partial<ZaloDeliveryError>);
    },
  );

  it('classifies an aborted request as retryable timeout', async () => {
    const provider = new MockZaloProvider(
      configuration,
      (jest
        .fn()
        .mockRejectedValue(
          new DOMException('timeout', 'TimeoutError'),
        ) as unknown as typeof fetch),
    );

    await expect(provider.send(message)).rejects.toMatchObject({
      code: 'timeout',
      provider: 'mock',
      retryable: true,
    } satisfies Partial<ZaloDeliveryError>);
  });

  it('rejects a malformed recipient phone number before calling the provider', async () => {
    const fetchImplementation: FetchMock = jest.fn();
    const provider = new MockZaloProvider(
      configuration,
      fetchImplementation as unknown as typeof fetch,
    );

    await expect(
      provider.send({ ...message, recipientPhone: '12345' }),
    ).rejects.toMatchObject({
      code: 'rejected',
      retryable: false,
    } satisfies Partial<ZaloDeliveryError>);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it('rejects an empty template code before calling the provider', async () => {
    const fetchImplementation: FetchMock = jest.fn();
    const provider = new MockZaloProvider(
      configuration,
      fetchImplementation as unknown as typeof fetch,
    );

    await expect(
      provider.send({ ...message, templateCode: '  ' }),
    ).rejects.toMatchObject({
      code: 'rejected',
      retryable: false,
    } satisfies Partial<ZaloDeliveryError>);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
