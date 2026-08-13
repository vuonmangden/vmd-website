'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { createRoomBooking, type CheckoutPayload } from './booking-api';

function number(value: string | null, fallback: number) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 && parsed <= 20 ? parsed : fallback; }

export function CheckoutForm() {
  const params = useSearchParams();
  const initial = useMemo(() => ({ roomSlug: params.get('room') ?? '', checkIn: params.get('checkIn') ?? '', checkOut: params.get('checkOut') ?? '', adults: Math.max(1, number(params.get('guests'), 2)), children: 0 }), [params]);
  const [form, setForm] = useState<CheckoutPayload>({ ...initial, fullName: '', phone: '', email: '', specialRequest: '', expectedArrivalTime: '' });
  const [step, setStep] = useState(1); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const key = useRef<string | null>(null);
  function update<K extends keyof CheckoutPayload>(field: K, value: CheckoutPayload[K]) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    if (!form.roomSlug || !form.checkIn || !form.checkOut) { setError('Vui lòng chọn phòng và ngày ở từ trang phòng.'); return; }
    setBusy(true); key.current ??= crypto.randomUUID();
    try { const result = await createRoomBooking({ ...form, email: form.email || undefined, specialRequest: form.specialRequest || undefined, expectedArrivalTime: form.expectedArrivalTime || undefined }, key.current); window.location.assign(`/thanh-toan?payment=${encodeURIComponent(result.paymentReference)}`); }
    catch { setError('Chưa thể tạo yêu cầu đặt phòng. Giá và phòng trống sẽ được kiểm tra lại trên máy chủ. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <form className="checkout-form" onSubmit={submit} aria-describedby={error ? 'checkout-error' : undefined}>
    <ol className="checkout-stepper" aria-label="Các bước đặt phòng"><li className={step >= 1 ? 'active' : ''}>1. Phòng &amp; ngày ở</li><li className={step >= 2 ? 'active' : ''}>2. Thông tin khách</li><li className={step >= 3 ? 'active' : ''}>3. Xác nhận &amp; thanh toán</li></ol>
    <fieldset><legend>Thông tin lưu trú</legend><p className="room-message">Bạn đang đặt loại phòng <strong>{form.roomSlug || 'chưa chọn'}</strong>. Giá cuối cùng được máy chủ tính lại khi gửi yêu cầu.</p><div className="checkout-grid"><label>Ngày nhận phòng<input required type="date" value={form.checkIn} onChange={(e) => update('checkIn', e.target.value)} /></label><label>Ngày trả phòng<input required type="date" value={form.checkOut} onChange={(e) => update('checkOut', e.target.value)} /></label><label>Người lớn<input required min="1" max="20" type="number" value={form.adults} onChange={(e) => update('adults', Number(e.target.value))} /></label><label>Trẻ em<input required min="0" max="20" type="number" value={form.children} onChange={(e) => update('children', Number(e.target.value))} /></label></div><button type="button" className="button button-secondary" onClick={() => setStep(2)}>Tiếp tục</button></fieldset>
    {step >= 2 && <fieldset><legend>Thông tin khách</legend><div className="checkout-grid"><label>Họ và tên<input required maxLength={150} value={form.fullName} onChange={(e) => update('fullName', e.target.value)} /></label><label>Số điện thoại Việt Nam<input required inputMode="tel" pattern="(?:\\+84|84|0)(?:3|5|7|8|9)[0-9]{8}" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></label><label>Email <small>(khuyến nghị)</small><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></label><label>Giờ đến dự kiến <small>(tuỳ chọn)</small><input maxLength={50} value={form.expectedArrivalTime} onChange={(e) => update('expectedArrivalTime', e.target.value)} /></label></div><label>Yêu cầu đặc biệt <small>(tuỳ chọn)</small><textarea maxLength={1000} value={form.specialRequest} onChange={(e) => update('specialRequest', e.target.value)} /></label><button type="button" className="button button-secondary" onClick={() => setStep(3)}>Xem lại &amp; thanh toán</button></fieldset>}
    {step >= 3 && <fieldset><legend>Xác nhận đặt phòng</legend><p className="room-message">Sau khi gửi, bạn sẽ chuyển trực tiếp đến mã QR thanh toán sandbox. Không nhập CCCD/hộ chiếu trên trang này.</p><button className="button button-primary" disabled={busy} type="submit">{busy ? 'Đang tạo đặt phòng…' : 'Tạo đặt phòng & thanh toán'}</button></fieldset>}
    {error && <p id="checkout-error" className="room-message" role="alert">{error}</p>}
    <p className="room-message"><Link href="/phong">Quay lại chọn phòng</Link></p>
  </form>;
}
