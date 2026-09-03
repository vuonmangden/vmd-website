import { AdminRoute } from '../../admin-route';
import { AdminShell } from '../../shell/admin-shell';
import { ContentPageDetailView } from '../content-page-detail-view';

type Props = Readonly<{ params: Promise<{ id: string }> }>;

export default async function ContentPageDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminRoute requiredPermissions={['content.manage']}>
      <AdminShell>
        <h1>Chi tiết trang nội dung</h1>
        <ContentPageDetailView id={id} />
      </AdminShell>
    </AdminRoute>
  );
}
