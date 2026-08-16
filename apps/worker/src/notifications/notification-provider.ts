/**
 * Channel adapter contract per Tech Spec §22.1. Every external provider
 * (email, Zalo, SMS) is reached through this interface so business code
 * never talks to a vendor SDK directly.
 */

export interface NotificationMessage {
  /** Recipient address. Email address for the email channel. */
  to: string;
  subject: string;
  /** Responsive HTML body (§22.2). */
  html: string;
  /** Plain-text fallback, required by §22.2. */
  text: string;
  /** Deduplication key per §22.4, forwarded to the provider when supported. */
  deduplicationKey?: string;
  replyTo?: string;
}

export interface NotificationResult {
  success: boolean;
  /** Provider-side message id, stored on notification_deliveries. */
  providerMessageId?: string;
  /** Provider name recorded on the delivery row. */
  provider: string;
  error?: string;
}

export interface NotificationProvider {
  send(message: NotificationMessage): Promise<NotificationResult>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
