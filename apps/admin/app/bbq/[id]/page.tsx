import { AdminRoute } from '../../admin-route';
import { AdminShell } from '../../shell/admin-shell';
import { BbqDetailView } from '../bbq-detail-view';

type Props = Readonly<{ params: Promise<{ id: string }> }>;

export default async function BbqDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminRoute requiredPermissions={['bbq.manage']}>
      <AdminShell>
        <h1>Chi tiết đặt bàn BBQ</h1>
        <BbqDetailView id={id} />
      </AdminShell>
    </AdminRoute>
  );
}
