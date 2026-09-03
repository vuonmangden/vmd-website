import { AdminRoute } from '../admin-route';
import { AdminShell } from '../shell/admin-shell';
import { ArticlesListView } from './articles-list-view';

export default function ArticlesPage() {
  return (
    <AdminRoute requiredPermissions={['content.manage']}>
      <AdminShell>
        <h1>Tin tức</h1>
        <ArticlesListView />
      </AdminShell>
    </AdminRoute>
  );
}
