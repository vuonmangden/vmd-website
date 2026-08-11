import { AdminRoute } from './admin-route';

export default function Page() {
  return <AdminRoute><main><h1>VMD Admin</h1><p>Trang quản trị được bảo vệ bằng phiên đăng nhập và quyền từ máy chủ.</p></main></AdminRoute>;
}
