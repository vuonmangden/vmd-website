import Link from 'next/link';
import { SkipLink } from '../skip-link';
import { BbqBrowser } from './bbq-browser';

export default function BbqPage() {
  return (
    <>
      <SkipLink />
      <header className="site-header">
        <Link className="wordmark" href="/"><span>Vườn Măng Đen</span><small>Homestay &amp; BBQ</small></Link>
        <nav aria-label="Điều hướng BBQ"><Link href="/">Trang chủ</Link></nav>
      </header>
      <main id="noi-dung" tabIndex={-1} className="room-page">
        <section aria-labelledby="bbq-title">
          <p className="eyebrow">Đặt bàn BBQ</p>
          <h1 id="bbq-title">Chọn khu vực và bàn phù hợp</h1>
          <p className="room-lead">Danh sách khu vực, bàn và tình trạng trống dưới đây là dữ liệu sandbox phục vụ bản demo; chưa phải thông tin mở bán chính thức.</p>
          <BbqBrowser />
        </section>
      </main>
    </>
  );
}
