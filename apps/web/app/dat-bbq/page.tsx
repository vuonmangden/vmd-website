import Link from 'next/link';
import { Suspense } from 'react';
import { SkipLink } from '../skip-link';
import { CheckoutForm } from './checkout-form';

export default function BbqBookingPage() {
  return (
    <>
      <SkipLink />
      <header className="site-header">
        <Link className="wordmark" href="/"><span>Vườn Măng Đen</span><small>Homestay &amp; BBQ</small></Link>
      </header>
      <main id="noi-dung" tabIndex={-1} className="room-page checkout-page">
        <p className="eyebrow">Đặt bàn BBQ demo</p>
        <h1>Hoàn tất thông tin đặt bàn</h1>
        <p className="room-lead">Luồng này dùng dữ liệu bàn BBQ và thanh toán sandbox; không phải đơn đặt bàn thật.</p>
        <Suspense fallback={<p className="room-message">Đang chuẩn bị biểu mẫu…</p>}>
          <CheckoutForm />
        </Suspense>
      </main>
    </>
  );
}
