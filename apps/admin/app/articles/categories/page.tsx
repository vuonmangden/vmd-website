import { AdminRoute } from '../../admin-route';
import { AdminShell } from '../../shell/admin-shell';
import { CategoriesView } from '../categories-view';

export default function ArticleCategoriesPage() {
  return (
    <AdminRoute requiredPermissions={['content.manage']}>
      <AdminShell>
        <h1>Chuyên mục tin tức</h1>
        <CategoriesView />
      </AdminShell>
    </AdminRoute>
  );
}
