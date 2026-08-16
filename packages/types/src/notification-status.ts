export const NotificationJobStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SENT: 'sent',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type NotificationJobStatus =
  (typeof NotificationJobStatus)[keyof typeof NotificationJobStatus];

export const NotificationDeliveryStatus = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
} as const;

export type NotificationDeliveryStatus =
  (typeof NotificationDeliveryStatus)[keyof typeof NotificationDeliveryStatus];

export const OutboxEventStatus = {
  PENDING: 'pending',
  PUBLISHED: 'published',
  FAILED: 'failed',
} as const;

export type OutboxEventStatus =
  (typeof OutboxEventStatus)[keyof typeof OutboxEventStatus];
