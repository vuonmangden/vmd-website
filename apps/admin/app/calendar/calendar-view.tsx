'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError } from '../lib/api-client';
import { getCalendarRange } from './calendar-api';
import type { CalendarRange } from './calendar-api';
import { addDays, cellFor, dateRange } from './occupancy';

const WINDOW_DAYS = 7;

export type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; range: CalendarRange };

function todayOperationalDate(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function CalendarView() {
  const [from, setFrom] = useState<string>(() => todayOperationalDate());
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getCalendarRange(from, addDays(from, WINDOW_DAYS))
      .then((range) => { if (!cancelled) setState({ status: 'ready', range }); })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof ApiError ? error.message : 'Không thể tải lịch';
        setState({ status: 'error', message });
      });
    return () => { cancelled = true; };
  }, [from]);

  return (
    <div className="calendar-page">
      <div className="calendar-toolbar">
        <button type="button" onClick={() => setFrom((current) => addDays(current, -WINDOW_DAYS))}>← Tuần trước</button>
        <span className="calendar-range-label">{from} → {addDays(from, WINDOW_DAYS - 1)}</span>
        <button type="button" onClick={() => setFrom((current) => addDays(current, WINDOW_DAYS))}>Tuần sau →</button>
        <button type="button" onClick={() => setFrom(todayOperationalDate())}>Hôm nay</button>
      </div>
      <CalendarContent state={state} />
    </div>
  );
}

/** Split from CalendarView the same way DashboardView/DashboardContent are — pure and testable via renderToStaticMarkup, since this app's tests run without jsdom and can't execute an effect. */
export function CalendarContent({ state }: { state: ViewState }) {
  if (state.status === 'loading') return <p role="status" aria-busy="true">Đang tải lịch…</p>;
  if (state.status === 'error') return <p role="alert" className="dashboard-error">{state.message}</p>;

  const { range } = state;
  const dates = dateRange(range.from, range.to);

  return (
    <div className="calendar">
      <div className="calendar-grid" style={{ gridTemplateColumns: `10rem repeat(${dates.length}, 1fr)` }}>
        <div className="calendar-corner" />
        {dates.map((date) => <div key={date} className="calendar-day-head">{shortDate(date)}</div>)}
        {range.rooms.map((room) => (
          <FragmentRow key={room.id} label={`${room.name} (${room.code})`}>
            {dates.map((date) => {
              const cell = cellFor(room.id, date, range.bookings, range.roomBlocks);
              return (
                <div key={date} className={`calendar-cell calendar-cell-${cell.status}`} title={cell.label || undefined}>
                  {cell.label}
                </div>
              );
            })}
          </FragmentRow>
        ))}
      </div>

      <h2 className="dashboard-section-title">Đặt bàn BBQ trong khoảng này</h2>
      {range.bbqReservations.length === 0 ? (
        <p>Không có đặt bàn BBQ nào.</p>
      ) : (
        <ul className="bbq-list">
          {range.bbqReservations.map((reservation) => (
            <li key={reservation.id}>
              <span className="bbq-code">{reservation.reservationCode}</span>
              <span>{reservation.reservationDate.slice(0, 10)} · {reservation.startTime}–{reservation.endTime}</span>
              <span className={`bbq-status bbq-status-${reservation.status.toLowerCase()}`}>{reservation.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FragmentRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <div className="calendar-room-head">{label}</div>
      {children}
    </>
  );
}

function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}
