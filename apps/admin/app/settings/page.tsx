import { AdminRoute } from '../admin-route';
import { AdminShell } from '../shell/admin-shell';
import { SettingsView } from './settings-view';

export default function SettingsPage() {
  return (
    <AdminRoute requiredPermissions={['content.manage']}>
      <AdminShell>
        <h1>Cài đặt</h1>
        <SettingsView />
      </AdminShell>
    </AdminRoute>
  );
}
