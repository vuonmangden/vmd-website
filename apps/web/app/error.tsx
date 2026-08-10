'use client';

export default function Error({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main className="status-page">
      <p className="eyebrow">Vườn Măng Đen</p>
      <h1>Không thể tải nội dung</h1>
      <p>Vui lòng thử lại.</p>
      <button className="button button-primary" type="button" onClick={reset}>
        Thử lại
      </button>
    </main>
  );
}
