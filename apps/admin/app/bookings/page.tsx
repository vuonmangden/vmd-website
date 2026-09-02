import { AdminRoute } from '../admin-route';
import { AdminShell } from '../shell/admin-shell';
import { BookingsListView } from './bookings-list-view';

export default function BookingsPage() {
  return (
    <AdminRoute requiredPermissions={['booking.read']}>
      <AdminShell>
        <h1>Đặt phòng</h1>
        <BookingsListView />
      </AdminShell>
    </AdminRoute>
  );
}
