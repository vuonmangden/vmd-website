import { AdminRoute } from '../../admin-route';
import { AdminShell } from '../../shell/admin-shell';
import { StaffDetailView } from '../staff-detail-view';

type Props = Readonly<{ params: Promise<{ id: string }> }>;

export default async function StaffDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminRoute requiredPermissions={['user.manage']}>
      <AdminShell>
        <h1>Chi tiết nhân viên</h1>
        <StaffDetailView id={id} />
      </AdminShell>
    </AdminRoute>
  );
}
