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
          <h1 id="bbq-title">Đặt BBQ tại Vườn</h1>
          <p className="room-lead">Chọn ngày và giờ đến. Vườn phục vụ từ 10:30 đến 21:30; lễ tân sẽ xác nhận booking, còn nhóm 5–20 khách được sắp xếp bàn khi tới nơi.</p>
          <BbqBrowser />
        </section>
      </main>
    </>
  );
}
