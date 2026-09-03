import { AdminRoute } from './admin-route';
import { DashboardView } from './dashboard/dashboard-view';
import { AdminShell } from './shell/admin-shell';

export default function Page() {
  return (
    <AdminRoute>
      <AdminShell>
        <h1>Tổng quan vận hành</h1>
        <DashboardView />
      </AdminShell>
    </AdminRoute>
  );
}
