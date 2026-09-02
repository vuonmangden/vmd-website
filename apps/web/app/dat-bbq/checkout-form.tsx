'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { createBbqReservation, type BbqCheckoutPayload } from './bbq-booking-api';

function number(value: string | null, fallback: number) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 && parsed <= 50 ? parsed : fallback; }

export function CheckoutForm() {
  const params = useSearchParams();
  const confirmationCode = params.get('confirmed');
  const initial = useMemo(() => ({
    date: params.get('date') ?? '',
    startTime: params.get('startTime') ?? '',
    adults: Math.max(1, number(params.get('guests'), 4)),
    children: 0,
  }), [params]);
  const [form, setForm] = useState<BbqCheckoutPayload>({ ...initial, fullName: '', phone: '', email: '', specialRequest: '' });
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef<string | null>(null);

  if (confirmationCode) {
    return <section className="checkout-form" aria-live="polite"><h2>Đã gửi yêu cầu BBQ</h2><p className="room-message">Mã yêu cầu của bạn là <strong>{confirmationCode}</strong>. Lễ tân sẽ kiểm tra quota và liên hệ để xác nhận. Vườn không thu cọc giữ bàn.</p><p className="room-message"><Link href="/bbq">Quay lại trang BBQ</Link></p></section>;
  }

  function update<K extends keyof BbqCheckoutPayload>(field: K, value: BbqCheckoutPayload[K]) { setForm((current) => ({ ...current, [field]: value })); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.date || !form.startTime) { setError('Vui lòng chọn ngày và giờ đến từ trang BBQ.'); return; }
    setBusy(true);
    key.current ??= crypto.randomUUID();
    try {
      const result = await createBbqReservation({ ...form, email: form.email || undefined, specialRequest: form.specialRequest || undefined }, key.current);
      window.location.assign(`/dat-bbq?confirmed=${encodeURIComponent(result.reservationCode)}`);
    } catch {
      setError('Chưa thể tạo yêu cầu đặt bàn. Tình trạng bàn trống sẽ được kiểm tra lại trên máy chủ. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="checkout-form" onSubmit={submit} aria-describedby={error ? 'checkout-error' : undefined}>
      <ol className="checkout-stepper" aria-label="Các bước đặt bàn BBQ">
        <li className={step >= 1 ? 'active' : ''}>1. Ngày &amp; giờ đến</li>
        <li className={step >= 2 ? 'active' : ''}>2. Thông tin khách</li>
        <li className={step >= 3 ? 'active' : ''}>3. Gửi yêu cầu</li>
      </ol>
      <fieldset>
        <legend>Thông tin đặt bàn</legend>
        <p className="room-message">Bạn dự kiến đến ngày <strong>{form.date || '—'}</strong> lúc <strong>{form.startTime || '—'}</strong>. Lễ tân sẽ xác nhận booking và sắp xếp bàn khi bạn đến.</p>
        <div className="checkout-grid">
          <label>Người lớn<input required min="1" max="50" type="number" value={form.adults} onChange={(e) => update('adults', Number(e.target.value))} /></label>
          <label>Trẻ em<input required min="0" max="50" type="number" value={form.children} onChange={(e) => update('children', Number(e.target.value))} /></label>
        </div>
        <button type="button" className="button button-secondary" onClick={() => setStep(2)}>Tiếp tục</button>
      </fieldset>
      {step >= 2 && (
        <fieldset>
          <legend>Thông tin khách</legend>
          <div className="checkout-grid">
            <label>Họ và tên<input required maxLength={150} value={form.fullName} onChange={(e) => update('fullName', e.target.value)} /></label>
            <label>Số điện thoại Việt Nam<input required inputMode="tel" pattern="(?:\+84|84|0)(?:3|5|7|8|9)[0-9]{8}" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></label>
            <label>Email <small>(khuyến nghị)</small><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></label>
          </div>
          <label>Yêu cầu đặc biệt <small>(tuỳ chọn)</small><textarea maxLength={1000} value={form.specialRequest} onChange={(e) => update('specialRequest', e.target.value)} /></label>
          <button type="button" className="button button-secondary" onClick={() => setStep(3)}>Xem lại yêu cầu</button>
        </fieldset>
      )}
      {step >= 3 && (
        <fieldset>
          <legend>Xác nhận đặt bàn</legend>
          <p className="room-message">Vườn không thu cọc giữ bàn. Sau khi gửi, lễ tân sẽ kiểm tra quota ngày và liên hệ xác nhận. Nhóm từ 5 khách được sắp xếp bàn khi tới nơi.</p>
          <button className="button button-primary" disabled={busy} type="submit">{busy ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu đặt BBQ'}</button>
        </fieldset>
      )}
      {error && <p id="checkout-error" className="room-message" role="alert">{error}</p>}
      <p className="room-message"><Link href="/bbq">Quay lại chọn bàn</Link></p>
    </form>
  );
}
