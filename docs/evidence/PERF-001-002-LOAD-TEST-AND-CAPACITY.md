# PERF-001 — Load Test & PERF-002 — Cache và Capacity

**Ngày:** 2026-09-03 · **Thực hiện:** Claude · **Mục tiêu tải:** 2.000–5.000 lượt/ngày (theo tracker)

Hai task được làm chung một phiên vì `PERF-002` phụ thuộc trực tiếp kết quả `PERF-001`. Không có thay đổi code nào trong PR này — thuần túy đo đạc và phân tích trên server thật (Docker sẵn có, cùng hạ tầng đã dùng ở `SEC-002`).

## Bối cảnh quy mô

2.000–5.000 lượt/ngày ≈ trung bình 0,03–0,06 request/giây, kể cả dồn vào giờ cao điểm cũng khó vượt vài request/giây. Đây là quy mô rất nhỏ theo chuẩn web hiện đại — mục tiêu chính của load test không phải "chịu được tải cao" mà là **xác nhận không có nút thắt kiến trúc rõ ràng** ở quy mô này và hệ thống phản hồi ổn định dưới tải burst (đợt cao điểm ngắn, ví dụ nhiều khách cùng tra cứu giá vào giờ vàng).

## Công cụ

`autocannon` (qua `npx`, không thêm vào `package.json` — chỉ dùng một lần cho việc đo đạc, không phải một phần pipeline CI). Chạy trên `node dist/main.js` thật, DB Postgres thật đã seed catalog production.

## Kết quả PERF-001

| Endpoint | Loại | Kết nối | Thời lượng | Req/s trung bình | Latency p50 | Latency p99 | Lỗi |
|---|---|---|---|---|---|---|---|
| `GET /public/rooms` | Đọc thuần | 25 | 20s | **665** | 37ms | 57ms | 0 |
| `POST /public/rooms/availability/search` | Đọc + tính toán | 25 | 20s | **551** | 45ms | 68ms | 0 |
| `POST /public/room-bookings` | Ghi (burst 53k request) | 15 | 20s | 5 thành công, còn lại `429` | — | — | 0 lỗi/timeout thật |

**Đọc**: cả hai endpoint đọc chính đều xử lý 550-665 request/giây với latency dưới 70ms ở p99 — riêng một endpoint này đã xử lý xong lượng tương đương **cả ngày mục tiêu (5.000 lượt) trong chưa đầy 8 giây**. Không có headroom nào đáng lo ở quy mô Phase 1.

**Ghi (booking)**: burst test 53.000 request/20s từ một IP chỉ tạo được 5 booking thành công — không phải nút thắt hiệu năng, mà là `PublicBookingRateLimitService` (5 lượt tạo/phút/IP, đã review ở `SEC-001`) hoạt động **đúng như thiết kế**, chặn đứng áp lực ghi từ một nguồn duy nhất trước khi chạm tới DB. Đây là kết quả tốt cho capacity planning: tầng ứng dụng tự bảo vệ DB khỏi write storm mà không cần can thiệp gì thêm. 5 request thành công đó — chọn ngày/phòng khác nhau để tránh bị chặn bởi unique constraint — hoàn tất trong cửa sổ **9ms** (17:31:00.374 → 17:31:00.383), không lỗi, không timeout.

**Xác nhận toàn vẹn dữ liệu dưới tải đồng thời**: sau burst test, kiểm tra `room_occupancies` không có cặp `(room_id, stay_date)` nào trùng lặp — 5 write đồng thời không sinh ra dữ liệu hỏng, unique constraint (đã review ở `SEC-001`) giữ vững dưới tải thật, không chỉ đúng trên giấy.

## Kết quả PERF-002

**Connection pool**: `PrismaService` dùng `PrismaPg({ connectionString })` (`apps/api/src/prisma/prisma.service.ts`) — **không cấu hình tường minh** `connection_limit`/`pool_timeout`, nên dùng mặc định của `pg`'s `Pool` (10 connection). Ở quy mô 2.000–5.000 lượt/ngày, 10 connection dư sức — không một lần đo nào trong PERF-001 chạm tới lỗi hết connection hay timeout hàng đợi. **Khuyến nghị**: giữ nguyên mặc định cho Phase 1; chỉ cần xem lại nếu traffic tăng lên gấp nhiều lần bậc độ lớn hiện tại (không phải quyết định cấp bách, ghi nhận để tham khảo khi có PERF task sau này).

**Index**: kiểm tra các bảng nằm trên đường truy vấn nóng nhất — `Booking.bookingCode` (`@unique`, tự có index), `Customer.phoneNormalized`/`emailNormalized` (`@@index` tường minh — dùng bởi `booking-lookup.service.ts`'s `findMatching()`, endpoint tra cứu công khai nhạy cảm nhất về hiệu năng vì không cần đăng nhập), `RoomOccupancy` (`@@unique([roomId, stayDate])`, vừa là index vừa là hàng rào chống double-booking). Không phát hiện thiếu index nào trên đường dẫn đã đo.

**Backpressure**: không quan sát được hiện tượng nghẽn/xếp hàng nào trong toàn bộ phiên đo — kể cả burst 53k request cũng được xử lý trơn tru (0 lỗi/timeout), vì rate limiter tầng ứng dụng chặn áp lực ghi trước khi nó chạm tới DB, còn tầng đọc (không rate limit) đã chứng minh dư sức tải ở mục trên.

## Kết luận

Không có nút thắt kiến trúc nào cần xử lý ở quy mô Phase 1 đã công bố (2.000–5.000 lượt/ngày). Không cần thêm cache layer (Redis đã có sẵn cho BullMQ nhưng chưa dùng cho response caching — không cần thiết ở quy mô này), không cần tinh chỉnh connection pool, không thiếu index trên đường dẫn nóng. Khuyến nghị lớn nhất không phải kỹ thuật mà là quy trình: các con số đo được ở đây **chỉ đại diện cho môi trường cục bộ** (Postgres/Redis chạy Docker cùng máy với API, độ trễ mạng gần bằng 0) — khi có staging/production thật (`PRE-007`), nên đo lại một lần với độ trễ mạng thật trước khi coi `PERF-001`/`PERF-002` là đã xác nhận đầy đủ cho production.

## Ngoài phạm vi

- Không test được luồng có xác thực (admin dashboard, báo cáo) — cùng lý do đã ghi ở `SEC-002` (thiếu Supabase project thật cục bộ).
- Không đo được worker app (`apps/worker`) xử lý notification/outbox dưới tải — nằm ngoài các endpoint HTTP đã đo.
- Chưa dựng benchmark có thể chạy lại tự động trong CI (chỉ là phiên đo thủ công một lần) — nếu cần theo dõi hiệu năng liên tục, nên cân nhắc thêm vào `OPS-005` (Observability) thay vì lặp lại `PERF-001` mỗi lần.
