'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatVnd, getPublicPaymentStatus, nextPaymentPollDelay, type PublicPaymentStatusResponse, validPaymentReference } from './payment-api';

const SUPPORT_PHONE = '0972 947 942';
const SUPPORT_EMAIL = 'vuonmangden.com@gmail.com';

type View = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; payment: PublicPaymentStatusResponse };

export function PaymentStatus() {
  const params = useSearchParams();
  const reference = params.get('payment');
  const [view, setView] = useState<View>(() => validPaymentReference(reference) ? { kind: 'loading' } : { kind: 'error' });

  useEffect(() => {
    const paymentReference = reference;
    if (!paymentReference || !validPaymentReference(paymentReference)) return;
    const safePaymentReference: string = paymentReference;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    async function refresh() {
      try {
        const payment = await getPublicPaymentStatus(safePaymentReference);
        if (!active) return;
        setView({ kind: 'ready', payment });
        const delay = nextPaymentPollDelay(payment.status, Date.now() - startedAt);
        if (delay !== null) {
          timer = setTimeout(() => { void refresh(); }, delay);
        }
      } catch {
        if (active) setView({ kind: 'error' });
      }
    }
    void refresh();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [reference]);

  if (view.kind === 'loading') return <section className="payment-panel" aria-live="polite"><p>Đang kiểm tra trạng thái thanh toán…</p></section>;
  if (view.kind === 'error') return <section className="payment-panel" role="alert"><h2>Chưa thể hiển thị thanh toán</h2><p>Vui lòng kiểm tra lại đường dẫn hoặc liên hệ hỗ trợ để được giúp đỡ.</p><Support /></section>;
  return <PaymentState payment={view.payment} />;
}

function PaymentState({ payment }: { payment: PublicPaymentStatusResponse }) {
  if (payment.status === 'PAID') return <section className="payment-panel payment-success" aria-live="polite"><p className="eyebrow">Thanh toán đã được ghi nhận</p><h2>Đặt phòng đang được xác nhận</h2><p>Chúng tôi đã nhận được thanh toán sandbox của bạn. Vui lòng giữ lại mã tham chiếu đặt phòng từ trang xác nhận.</p><Link className="button button-primary" href="/tra-cuu-booking">Tra cứu booking</Link></section>;
  if (payment.status === 'EXPIRED') return <section className="payment-panel" role="status"><p className="eyebrow">Đã hết hạn thanh toán</p><h2>Yêu cầu thanh toán này không còn hiệu lực</h2><p>Vui lòng liên hệ hỗ trợ để được hướng dẫn. Giai đoạn demo không tạo lại thanh toán tại đây.</p><Support /></section>;
  if (payment.status === 'RECONCILIATION_REQUIRED') return <section className="payment-panel" role="status"><p className="eyebrow">Đang được đối soát</p><h2>Thanh toán của bạn đang được kiểm tra</h2><p>Chúng tôi đang xác minh giao dịch. Vui lòng không thực hiện thêm thao tác thanh toán trên trang này.</p><Support /></section>;
  return <PendingPayment payment={payment} />;
}

function PendingPayment({ payment }: { payment: PublicPaymentStatusResponse }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(payment.expiresAt).getTime() - Date.now()));
  useEffect(() => {
    const timer = setInterval(() => setRemaining(Math.max(0, new Date(payment.expiresAt).getTime() - Date.now())), 1_000);
    return () => clearInterval(timer);
  }, [payment.expiresAt]);
  const expired = remaining === 0;
  return <section className="payment-panel" aria-live="polite">
    <p className="eyebrow">Thanh toán sandbox</p><h2>{expired ? 'Đang cập nhật trạng thái thanh toán' : 'Quét mã để hoàn tất thanh toán'}</h2>
    <p className="payment-amount">{formatVnd(payment.amount)}</p>
    <div className="payment-qr" aria-label="Mã QR thanh toán sandbox"><span aria-hidden="true">▦</span><strong>QR sandbox</strong><small>Chỉ dùng trong môi trường demo</small></div>
    <dl className="payment-details"><div><dt>Nội dung chuyển khoản</dt><dd>{payment.transferContent}</dd></div><div><dt>Mã tham chiếu</dt><dd>{payment.paymentIntentId}</dd></div><div><dt>Thời gian còn lại</dt><dd>{expired ? 'Đã đến hạn — đang kiểm tra lại' : formatRemaining(remaining)}</dd></div></dl>
    <p className="room-message">Trạng thái tự cập nhật định kỳ. Không hiển thị tài khoản ngân hàng hoặc dữ liệu giao dịch trên trang này.</p>
  </section>;
}

function Support() { return <p className="payment-support">Hỗ trợ: <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}>{SUPPORT_PHONE}</a> · <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>; }
function formatRemaining(milliseconds: number): string { const seconds = Math.floor(milliseconds / 1_000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
