'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { publicApi, stringList, type PublicRoom } from '../room-api';
export function RoomDetail({ slug }: Readonly<{ slug: string }>) {
  const [room, setRoom] = useState<PublicRoom | null>(null); const [error, setError] = useState(false);
  useEffect(() => { void publicApi<PublicRoom>(`/public/rooms/${encodeURIComponent(slug)}`).then(setRoom).catch(() => setError(true)); }, [slug]);
  if (error) return <main className="status-page"><h1>Không thể tải thông tin phòng</h1><p>Phòng không tồn tại hoặc dữ liệu demo đang tạm thời không khả dụng.</p><Link className="button button-primary" href="/phong">Quay lại danh sách phòng</Link></main>;
  if (!room) return <main className="status-page" aria-busy="true" aria-live="polite"><p>Đang tải thông tin phòng…</p></main>;
  const beds = stringList(room.bedConfiguration); const amenities = stringList(room.amenities);
  return <main className="room-page room-detail"><p className="eyebrow">Dữ liệu demo</p><Link href="/phong">← Danh sách phòng</Link><h1>{room.name}</h1><p className="room-lead">{room.description ?? room.shortDescription}</p><section className="room-facts" aria-label="Thông tin phòng"><div><strong>Sức chứa</strong><span>Tối đa {room.capacity.maxTotalGuests} khách</span></div><div><strong>Giường</strong><span>{beds.join(', ') || 'Đang cập nhật'}</span></div><div><strong>Tiện nghi</strong><span>{amenities.join(', ') || 'Đang cập nhật'}</span></div></section><p className="room-message">Giá và tình trạng phòng sẽ được xác nhận bằng bước kiểm tra sandbox.</p><Link className="button button-primary" href={`/dat-phong?room=${encodeURIComponent(room.slug)}`}>Chọn phòng này</Link></main>;
}
