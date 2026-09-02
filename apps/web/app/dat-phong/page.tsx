import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SkipLink } from '../skip-link';
import { CheckoutForm } from './checkout-form';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function BookingPage() {
  return <><SkipLink /><header className="site-header"><Link className="wordmark" href="/"><span>Vườn Măng Đen</span><small>Homestay &amp; BBQ</small></Link></header><main id="noi-dung" tabIndex={-1} className="room-page checkout-page"><p className="eyebrow">Đặt phòng trực tuyến</p><h1>Hoàn tất thông tin lưu trú</h1><p className="room-lead">Giá, phòng trống và mức cọc được máy chủ xác nhận trước khi tạo booking.</p><Suspense fallback={<p className="room-message">Đang chuẩn bị biểu mẫu…</p>}><CheckoutForm /></Suspense></main></>;
}
