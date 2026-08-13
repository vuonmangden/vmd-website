import Link from 'next/link';
import { Suspense } from 'react';
import { SkipLink } from '../skip-link';
import { PaymentStatus } from './payment-status';

export default function PaymentPage() {
  return <><SkipLink /><header className="site-header"><Link className="wordmark" href="/"><span>Vườn Măng Đen</span><small>Homestay &amp; BBQ</small></Link></header><main id="noi-dung" tabIndex={-1} className="room-page payment-page"><Suspense fallback={<section className="payment-panel" aria-live="polite">Đang chuẩn bị trang thanh toán…</section>}><PaymentStatus /></Suspense></main></>;
}
