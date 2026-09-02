import { AdminRoute } from '../admin-route';
import { AdminShell } from '../shell/admin-shell';
import { ReportsView } from './reports-view';

export default function ReportsPage() {
  return (
    <AdminRoute requiredPermissions={['report.read']}>
      <AdminShell>
        <h1>Báo cáo</h1>
        <ReportsView />
      </AdminShell>
    </AdminRoute>
  );
}
