import Link from 'next/link';
import { SkipLink } from '../skip-link';
import { RoomBrowser } from './room-browser';

export default function RoomsPage() {
  return <><SkipLink /><header className="site-header"><Link className="wordmark" href="/"><span>Vườn Măng Đen</span><small>Homestay &amp; BBQ</small></Link><nav aria-label="Điều hướng phòng"><Link href="/">Trang chủ</Link></nav></header><main id="noi-dung" tabIndex={-1} className="room-page"><section aria-labelledby="room-title"><p className="eyebrow">Phòng lưu trú</p><h1 id="room-title">Chọn không gian phù hợp cho chuyến đi</h1><p className="room-lead">Danh sách, mô tả và giá dưới đây là dữ liệu sandbox phục vụ bản demo; chưa phải thông tin mở bán chính thức.</p><RoomBrowser /></section></main></>;
}
