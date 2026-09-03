import { AdminRoute } from '../../admin-route';
import { AdminShell } from '../../shell/admin-shell';
import { ArticleDetailView } from '../article-detail-view';

type Props = Readonly<{ params: Promise<{ id: string }> }>;

export default async function ArticleDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminRoute requiredPermissions={['content.manage']}>
      <AdminShell>
        <h1>Chi tiết bài viết</h1>
        <ArticleDetailView id={id} />
      </AdminShell>
    </AdminRoute>
  );
}
