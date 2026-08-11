import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="auth-page">
      <p className="auth-eyebrow">Vườn Măng Đen</p>
      <h1>Đăng nhập quản trị</h1>
      <p>Chỉ dành cho nhân sự đã được kích hoạt.</p>
      <LoginForm />
    </main>
  );
}
