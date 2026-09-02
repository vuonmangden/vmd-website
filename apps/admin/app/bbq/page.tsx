import { AdminRoute } from '../admin-route';
import { AdminShell } from '../shell/admin-shell';
import { BbqListView } from './bbq-list-view';

export default function BbqPage() {
  return (
    <AdminRoute requiredPermissions={['bbq.manage']}>
      <AdminShell>
        <h1>Đặt bàn BBQ</h1>
        <BbqListView />
      </AdminShell>
    </AdminRoute>
  );
}
