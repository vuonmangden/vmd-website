export type ApplicationName = 'web' | 'admin' | 'api' | 'worker';

export {
  BookingStatus,
  BOOKING_TRANSITIONS,
  isValidBookingTransition,
} from './booking-status';

export {
  BbqStatus,
  BBQ_TRANSITIONS,
  isValidBbqTransition,
} from './bbq-status';

export { PaymentStatus } from './payment-status';

export {
  NotificationJobStatus,
  NotificationDeliveryStatus,
  OutboxEventStatus,
} from './notification-status';
