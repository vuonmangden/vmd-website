import { AdminRoute } from '../../admin-route';
import { AdminShell } from '../../shell/admin-shell';
import { ArticleNewView } from '../article-new-view';

export default function ArticleNewPage() {
  return (
    <AdminRoute requiredPermissions={['content.manage']}>
      <AdminShell>
        <h1>Bài viết mới</h1>
        <ArticleNewView />
      </AdminShell>
    </AdminRoute>
  );
}
