'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { publicApi, type PublicBbqArea } from './bbq-api';

type Search = { date: string; startTime: string; endTime: string; guests: number };

const DEFAULT_SEARCH: Search = { date: '', startTime: '11:00', endTime: '13:00', guests: 4 };

export function BbqBrowser() {
  const [areas, setAreas] = useState<PublicBbqArea[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState<Search>(DEFAULT_SEARCH);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    void publicApi<{ areas: (PublicBbqArea & { tables?: PublicBbqArea['availableTables'] })[] }>('/public/bbq/areas')
      .then((result) => setAreas(result.areas.map((area) => ({ ...area, availableTables: area.availableTables ?? area.tables ?? [] }))))
      .catch(() => setError(true));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    setAreas(null);
    setSearched(true);
    try {
      const result = await publicApi<{ areas: PublicBbqArea[] }>('/public/bbq/availability/search', { method: 'POST', body: JSON.stringify(search) });
      setAreas(result.areas);
    } catch {
      setError(true);
      setAreas([]);
    }
  }

  return (
    <>
      <form className="room-search" onSubmit={submit} aria-label="Kiểm tra bàn BBQ sandbox">
        <label>Ngày<input required type="date" value={search.date} onChange={(event) => setSearch({ ...search, date: event.target.value })} /></label>
        <label>Giờ bắt đầu<input required type="time" value={search.startTime} onChange={(event) => setSearch({ ...search, startTime: event.target.value })} /></label>
        <label>Giờ kết thúc<input required type="time" value={search.endTime} onChange={(event) => setSearch({ ...search, endTime: event.target.value })} /></label>
        <label>Số khách<input required type="number" min="1" max="50" value={search.guests} onChange={(event) => setSearch({ ...search, guests: Number(event.target.value) })} /></label>
        <button className="button button-primary" type="submit">Kiểm tra bàn trống</button>
      </form>
      {error && <p className="room-message" role="alert">Chưa thể kiểm tra bàn BBQ lúc này. Vui lòng thử lại.</p>}
      {areas === null && <p className="room-message" aria-live="polite">Đang tải danh sách khu vực…</p>}
      {areas?.length === 0 && <p className="room-message" aria-live="polite">{searched ? 'Không có bàn phù hợp với khung giờ và số khách đã chọn.' : 'Chưa có khu vực sandbox để hiển thị.'}</p>}
      {areas && areas.length > 0 && (
        <div className="room-grid" aria-live="polite">
          {areas.flatMap((area) => area.availableTables.map((table) => (
            <BbqTableCard key={table.id} area={area} table={table} search={search} searched={searched} />
          )))}
        </div>
      )}
    </>
  );
}

function BbqTableCard({ area, table, search, searched }: { area: PublicBbqArea; table: PublicBbqArea['availableTables'][number]; search: Search; searched: boolean }) {
  const query = new URLSearchParams({ table: table.id, date: search.date, startTime: search.startTime, endTime: search.endTime, guests: String(search.guests) });
  return (
    <article className="room-card">
      <p className="eyebrow">{area.name}</p>
      <h2>{table.name}</h2>
      <p>Sức chứa tối đa <strong>{table.maxCapacity} khách</strong>.</p>
      {searched && <p className="sandbox-quote">Còn trống cho khung giờ đã chọn.</p>}
      <div className="room-card-actions">
        <Link className="button button-primary" href={`/dat-bbq?${query.toString()}`}>Chọn bàn</Link>
      </div>
    </article>
  );
}
