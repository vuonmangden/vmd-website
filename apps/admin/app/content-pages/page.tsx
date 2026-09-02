import { AdminRoute } from '../admin-route';
import { AdminShell } from '../shell/admin-shell';
import { ContentPagesListView } from './content-pages-list-view';

export default function ContentPagesPage() {
  return (
    <AdminRoute requiredPermissions={['content.manage']}>
      <AdminShell>
        <h1>Trang nội dung</h1>
        <ContentPagesListView />
      </AdminShell>
    </AdminRoute>
  );
}
