import { AdminRoute } from '../../admin-route';
import { AdminShell } from '../../shell/admin-shell';
import { StaffInviteView } from '../staff-invite-view';

export default function StaffInvitePage() {
  return (
    <AdminRoute requiredPermissions={['user.manage']}>
      <AdminShell>
        <h1>Mời nhân viên</h1>
        <StaffInviteView />
      </AdminShell>
    </AdminRoute>
  );
}
