import { AdminRoute } from '../admin-route';
import { AdminShell } from '../shell/admin-shell';
import { CalendarView } from './calendar-view';

export default function CalendarPage() {
  return (
    <AdminRoute requiredPermissions={['booking.read']}>
      <AdminShell>
        <h1>Lịch phòng &amp; BBQ</h1>
        <CalendarView />
      </AdminShell>
    </AdminRoute>
  );
}
