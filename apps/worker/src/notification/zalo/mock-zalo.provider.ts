import {
  ZaloDeliveryError,
  type ZaloDeliveryResult,
  type ZaloMessage,
  type ZaloProvider,
} from './zalo.types';
import type { ZaloConfiguration } from './zalo.configuration';

const PHONE_PATTERN = /^(?:\+84|0)\d{9,10}$/u;

interface MockZaloResponse {
  messageId?: string;
}

export class MockZaloProvider implements ZaloProvider {
  constructor(
    private readonly configuration: ZaloConfiguration,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async send(message: ZaloMessage): Promise<ZaloDeliveryResult> {
    validateMessage(message);

    try {
      const response = await this.fetchImplementation(
        `${this.configuration.apiBaseUrl}/success`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: message.recipientPhone,
            templateCode: message.templateCode,
            templateParams: message.templateParams,
          }),
          signal: AbortSignal.timeout(this.configuration.timeoutMs),
        },
      );

      if (response.ok) {
        return {
          provider: 'mock',
          providerMessageId: await readMessageId(response),
          status: 'sent',
        };
      }

      throw responseError(response.status);
    } catch (error) {
      if (error instanceof ZaloDeliveryError) throw error;
      if (isTimeout(error)) {
        throw new ZaloDeliveryError('timeout', true, 'mock');
      }

      throw new ZaloDeliveryError('provider_unavailable', true, 'mock');
    }
  }
}

async function readMessageId(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as MockZaloResponse;
    return typeof payload.messageId === 'string' ? payload.messageId : null;
  } catch {
    return null;
  }
}

function responseError(status: number): ZaloDeliveryError {
  if (status === 429) {
    return new ZaloDeliveryError('rate_limited', true, 'mock');
  }

  if (status >= 500) {
    return new ZaloDeliveryError('provider_unavailable', true, 'mock');
  }

  return new ZaloDeliveryError('rejected', false, 'mock');
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}

function validateMessage(message: ZaloMessage): void {
  if (
    !PHONE_PATTERN.test(message.recipientPhone) ||
    !message.templateCode.trim()
  ) {
    throw new ZaloDeliveryError('rejected', false, 'mock');
  }
}
