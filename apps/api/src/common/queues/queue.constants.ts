export const QUEUE_NAMES = {
  OUTBOX_PUBLISH: 'outbox-publish',
  NOTIFICATION_SEND: 'notification-send',
  NOTIFICATION_SCHEDULE: 'notification-schedule',
  PAYMENT_WEBHOOK: 'payment-webhook',
  BOOKING_HOLD_EXPIRY: 'booking-hold-expiry',
  BBQ_HOLD_EXPIRY: 'bbq-hold-expiry',
  MEDIA_PROCESS: 'media-process',
  REPORT_EXPORT: 'report-export',
  MAINTENANCE: 'maintenance',
} as const;

export const RETRY_DEFAULTS = {
  PAYMENT_WEBHOOK: { attempts: 10, backoff: { type: 'exponential' as const, delay: 1000 } },
  NOTIFICATION: { attempts: 5, backoff: { type: 'exponential' as const, delay: 2000 } },
  MEDIA: { attempts: 3, backoff: { type: 'exponential' as const, delay: 3000 } },
  REPORT: { attempts: 3, backoff: { type: 'exponential' as const, delay: 5000 } },
} as const;
