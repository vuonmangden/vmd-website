'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { publicApi, type PublicQuote, type PublicRoom } from './room-api';

type Search = { checkIn: string; checkOut: string; guests: number };

export function RoomBrowser() {
  const [rooms, setRooms] = useState<PublicRoom[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState<Search>({ checkIn: '', checkOut: '', guests: 2 });
  const [searched, setSearched] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, PublicQuote>>({});
  useEffect(() => { void publicApi<{ items: PublicRoom[] }>('/public/rooms').then((result) => setRooms(result.items)).catch(() => setError(true)); }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(false); setRooms(null); setSearched(true);
    try {
      const result = await publicApi<{ items: PublicRoom[] }>('/public/rooms/availability/search', { method: 'POST', body: JSON.stringify(search) }); setRooms(result.items);
      const resolved = await Promise.all(result.items.map(async (room) => {
        try { return [room.slug, await publicApi<PublicQuote>('/public/rooms/quotes', { method: 'POST', body: JSON.stringify({ slug: room.slug, dateFrom: search.checkIn, dateTo: search.checkOut, adults: search.guests, children: 0 }) })] as const; }
        catch { return null; }
      }));
      setQuotes(Object.fromEntries(resolved.filter((entry): entry is readonly [string, PublicQuote] => entry !== null)));
    }
    catch { setError(true); setRooms([]); }
  }
  return <><form className="room-search" onSubmit={submit} aria-label="Kiểm tra phòng sandbox">
    <label>Ngày nhận phòng<input required type="date" value={search.checkIn} onChange={(event) => setSearch({ ...search, checkIn: event.target.value })} /></label>
    <label>Ngày trả phòng<input required type="date" value={search.checkOut} onChange={(event) => setSearch({ ...search, checkOut: event.target.value })} /></label>
    <label>Số khách<input required type="number" min="1" max="20" value={search.guests} onChange={(event) => setSearch({ ...search, guests: Number(event.target.value) })} /></label>
    <button className="button button-primary" type="submit">Kiểm tra phòng</button></form>
    {error && <p className="room-message" role="alert">Chưa thể kiểm tra phòng lúc này. Vui lòng thử lại.</p>}
    {rooms === null && <p className="room-message" aria-live="polite">Đang tải danh sách phòng…</p>}
    {rooms?.length === 0 && <p className="room-message" aria-live="polite">{searched ? 'Chưa có loại phòng phù hợp với ngày và số khách đã chọn.' : 'Chưa có loại phòng sandbox để hiển thị.'}</p>}
    {rooms && rooms.length > 0 && <div className="room-grid" aria-live="polite">{rooms.map((room) => <RoomCard key={room.slug} room={room} search={search} quote={quotes[room.slug]} />)}</div>}</>;
}

function RoomCard({ room, search, quote }: { room: PublicRoom; search: Search; quote?: PublicQuote }) {
  const query = new URLSearchParams({ room: room.slug, checkIn: search.checkIn, checkOut: search.checkOut, guests: String(search.guests) });
  return <article className="room-card"><p className="eyebrow">Dữ liệu demo</p><h2>{room.name}</h2><p>{room.shortDescription ?? 'Thông tin phòng đang được xây dựng bằng dữ liệu sandbox.'}</p><p><strong>Tối đa {room.capacity.maxTotalGuests} khách</strong></p>{quote && <p className="sandbox-quote"><strong>Giá sandbox: {new Intl.NumberFormat('vi-VN').format(quote.total)} {quote.currency}</strong><br />cho {quote.nights} đêm; chưa phải giá mở bán.</p>}<div className="room-card-actions"><Link className="button button-secondary" href={`/phong/${room.slug}`}>Xem chi tiết</Link><Link className="button button-primary" href={`/dat-phong?${query.toString()}`}>Chọn phòng</Link></div></article>;
}
