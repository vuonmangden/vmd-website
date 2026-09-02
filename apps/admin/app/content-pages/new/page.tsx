import { AdminRoute } from '../../admin-route';
import { AdminShell } from '../../shell/admin-shell';
import { ContentPageNewView } from '../content-page-new-view';

export default function ContentPageNewPage() {
  return (
    <AdminRoute requiredPermissions={['content.manage']}>
      <AdminShell>
        <h1>Trang nội dung mới</h1>
        <ContentPageNewView />
      </AdminShell>
    </AdminRoute>
  );
}
