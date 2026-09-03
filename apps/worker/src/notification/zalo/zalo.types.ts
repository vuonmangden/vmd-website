export type ZaloProviderName = 'mock';

export type ZaloDeliveryStatus = 'sent' | 'rejected';

export type ZaloFailureCode =
  | 'configuration'
  | 'disabled'
  | 'timeout'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'rejected';

export interface ZaloMessage {
  correlationId: string;
  /** Passed to a provider only when its production adapter supports it. */
  idempotencyKey: string;
  recipientPhone: string;
  templateCode: string;
  templateParams: Record<string, string>;
}

export interface ZaloDeliveryResult {
  provider: ZaloProviderName;
  providerMessageId: string | null;
  status: ZaloDeliveryStatus;
}

export interface ZaloProvider {
  send(message: ZaloMessage): Promise<ZaloDeliveryResult>;
}

export class ZaloDeliveryError extends Error {
  constructor(
    public readonly code: ZaloFailureCode,
    public readonly retryable: boolean,
    public readonly provider: ZaloProviderName | null,
  ) {
    super(`Zalo delivery failed: ${code}`);
    this.name = 'ZaloDeliveryError';
  }
}
