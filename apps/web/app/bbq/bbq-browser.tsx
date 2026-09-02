'use client';

import Link from 'next/link';
import { useState } from 'react';

type Search = { date: string; startTime: string; guests: number };
const DEFAULT_SEARCH: Search = { date: '', startTime: '10:30', guests: 4 };

/** Requests are quota-based: public visitors never receive a table promise. */
export function BbqBrowser() {
  const [search, setSearch] = useState<Search>(DEFAULT_SEARCH);
  const [error, setError] = useState<string | null>(null);
  const query = new URLSearchParams({ date: search.date, startTime: search.startTime, guests: String(search.guests) });

  function validate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!search.date || search.startTime < '10:30' || search.startTime > '21:30' || search.guests < 2 || search.guests > 20) {
      setError('Chọn ngày, giờ đến từ 10:30 đến 21:30 và nhóm từ 2 đến 20 khách.');
      return;
    }
    setError(null);
    window.location.assign(`/dat-bbq?${query.toString()}`);
  }

  return (
    <form className="room-search" onSubmit={validate} aria-describedby={error ? 'bbq-search-error' : undefined}>
      <label>Ngày đến<input required type="date" value={search.date} onChange={(event) => setSearch({ ...search, date: event.target.value })} /></label>
      <label>Giờ đến<input required type="time" min="10:30" max="21:30" value={search.startTime} onChange={(event) => setSearch({ ...search, startTime: event.target.value })} /></label>
      <label>Số khách<input required type="number" min="2" max="20" value={search.guests} onChange={(event) => setSearch({ ...search, guests: Number(event.target.value) })} /></label>
      <button className="button button-primary" type="submit">Gửi yêu cầu đặt BBQ</button>
      {error && <p id="bbq-search-error" className="room-message" role="alert">{error}</p>}
      <p className="room-message">Toàn Vườn phục vụ tối đa 120 khách mỗi ngày. Yêu cầu của bạn chỉ được xác nhận sau khi lễ tân liên hệ lại.</p>
      <p className="room-message"><Link href={`/dat-bbq?${query.toString()}`}>Tiếp tục đặt BBQ</Link></p>
    </form>
  );
}
