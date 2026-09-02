export type EmailProviderName = 'mailpit' | 'resend';

export type EmailDeliveryStatus = 'sent' | 'rejected';

export type EmailFailureCode =
  | 'configuration'
  | 'timeout'
  | 'authentication'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'rejected';

export interface EmailMessage {
  correlationId: string;
  /** Stable per notification job/channel; never derived from recipient PII. */
  idempotencyKey: string;
  recipient: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailDeliveryResult {
  provider: EmailProviderName;
  providerMessageId: string | null;
  status: EmailDeliveryStatus;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailDeliveryResult>;
}

export class EmailDeliveryError extends Error {
  constructor(
    public readonly code: EmailFailureCode,
    public readonly retryable: boolean,
    public readonly provider: EmailProviderName | null,
  ) {
    super(`Email delivery failed: ${code}`);
    this.name = 'EmailDeliveryError';
  }
}
