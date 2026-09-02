import { AdminRoute } from '../admin-route';
import { AdminShell } from '../shell/admin-shell';
import { StaffListView } from './staff-list-view';

export default function StaffPage() {
  return (
    <AdminRoute requiredPermissions={['user.manage']}>
      <AdminShell>
        <h1>Nhân sự</h1>
        <StaffListView />
      </AdminShell>
    </AdminRoute>
  );
}
