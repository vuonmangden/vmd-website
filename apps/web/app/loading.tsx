export default function Loading() {
  return (
    <main className="status-page" aria-busy="true" aria-live="polite">
      <p>Đang tải nội dung</p>
      <div className="loading-pulse" aria-hidden="true">
        <span />
        <span />
      </div>
    </main>
  );
}
