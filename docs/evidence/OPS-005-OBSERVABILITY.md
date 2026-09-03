# OPS-005 — Observability (Metrics/alerts)

**Ngày:** 2026-09-03 · **Thực hiện:** Claude

## Phạm vi và những gì KHÔNG làm

Tracker ghi "Metrics/alerts". Hai nửa khác nhau về việc có cần chủ dự án quyết định hay không:

- **Metrics** (đo đạc, expose dữ liệu vận hành): làm được hoàn toàn bằng code, không cần chủ dự án cung cấp thông tin gì.
- **Alerts** (cảnh báo chủ động khi có sự cố): **cần chủ dự án chọn kênh** (Slack webhook, PagerDuty, email...) và một dịch vụ scrape/giám sát thật (Prometheus, Grafana Cloud, Datadog...) — đây là quyết định hạ tầng/ngân sách thật, không tự quyết được. **Không làm phần này** trong task này; chỉ làm phần metrics để khi chủ dự án chọn công cụ giám sát, đã có dữ liệu sẵn để cắm vào.

## Đã làm — Metrics

`GET /metrics` (`apps/api/src/common/metrics/`): endpoint Prometheus exposition format, đo tự động **mọi** request qua một interceptor toàn cục (`MetricsInterceptor`, đăng ký qua `APP_INTERCEPTOR`) — không cần sửa từng controller. Đo được:

- `vmd_http_requests_total{method,route,status}` — đếm request theo method/route/status.
- `vmd_http_request_duration_ms_sum` / `_count` (theo method/route) — dạng "poor man's histogram" chuẩn Prometheus (summary không quantile), đủ để tính latency trung bình qua `rate()`/chia hai series trong PromQL.
- `vmd_process_uptime_seconds`, `vmd_process_resident_memory_bytes` — gauge tiến trình cơ bản.

**Tự viết tay, không dùng `prom-client`**: nhất quán với cách dự án đã làm ở mọi nơi khác (adapter SePay/Zalo tự viết thay vì SDK nặng, Supabase Admin API qua `fetch` thô thay vì `@supabase/supabase-js`) — chỉ ~90 dòng, không thêm dependency mới.

**`route` label dùng route pattern đã khớp** (`request.route.path`, ví dụ `/api/v1/admin/bookings/:id`), **không phải URL thô** — nếu dùng URL thô, mỗi booking ID khác nhau sẽ tạo một time series mới, một anti-pattern kinh điển của Prometheus (cardinality không giới hạn, rò rỉ bộ nhớ theo thời gian).

**`@Res()` lần đầu tiên trong repo**: `MetricsController` phải trả plaintext thô, không qua `ResponseTransformInterceptor` (interceptor toàn cục bọc mọi response thành công vào `{data, meta, correlationId}` — Prometheus scraper không hiểu định dạng đó). `RPT-002` từng cân nhắc và **cố tình không dùng** `@Res()` vì "chưa có tiền lệ, chưa kiểm chứng được, rủi ro cao hơn lợi ích khi chưa có ai tiêu thụ". Ở đây khác: không có cách nào khác để phục vụ đúng định dạng Prometheus — không phải lựa chọn thiết kế, là bắt buộc. Đã viết test kiểm tra đúng `response.setHeader`/`response.send` được gọi với nội dung đúng.

**Bổ sung khi làm — health check Redis giờ kiểm tra thật**: phát hiện `HealthController.dependencies()` trả cứng `redis: 'not_configured'` bất kể trạng thái thật — lỗi thời từ trước khi Redis được dùng thật cho BullMQ (`NTF-001` trở đi). Sửa bằng `RedisHealthService` mới, **cố tình không tái dùng `QueueModule`** (thử ban đầu, gây treo `app.module.spec.ts` — xem mục dưới) mà tự tạo một kết nối `ioredis` riêng, nhẹ, chỉ để ping.

## Sự cố trong lúc làm: treo toàn bộ test suite

Lần thử đầu, `HealthModule` import `QueueModule` để lấy một BullMQ queue làm health check. `QueueModule` đăng ký **9 queue** cùng lúc qua một `BullModule.registerQueue(...)`. `app.module.spec.ts` (test có sẵn) chỉ mock **một** trong chín token đó (`BullQueue_outbox-publish`) — khi `HealthModule` bắt đầu kéo theo `QueueModule`, 8 queue còn lại cố mở kết nối Redis thật lúc compile module test, và vì `ioredis` mặc định **retry vô hạn** khi kết nối thất bại, promise không bao giờ resolve → Jest treo, không in được output nào. Đây chính là góc nhìn khác của lớp lỗi đã tìm thấy ở `SEC-002` (`ResourceHoldsService`'s DI crash) — dependency không tường minh giữa các module dễ gây lỗi chỉ lộ ra lúc chạy thật/test thật, không lộ qua so sánh diff hay đọc code tĩnh.

**Sửa**: bỏ hẳn phụ thuộc `QueueModule` khỏi `HealthModule`; `RedisHealthService` tự mở một kết nối `ioredis` riêng với `retryStrategy: () => null` (tắt hẳn tự động thử lại vô hạn) và `lazyConnect: true`. Constructor dùng `@Optional() @Inject(TOKEN)` thay vì tham số kiểu thường có giá trị mặc định — **áp dụng đúng bài học vừa rút ra từ `SEC-002`**: một tham số constructor kiểu class thường (không có `@Inject` token) khiến NestJS DI cố tìm provider theo type lúc app thật khởi động, không tìm thấy sẽ crash `UnknownDependenciesException` — đúng lớp lỗi vừa tìm thấy ở `ResourceHoldsService`, giờ tránh được ngay từ đầu thay vì lặp lại.

## Xác minh

- `pnpm --filter @vmd/api run lint/typecheck/build`: đạt.
- `pnpm --filter @vmd/api run test`: **496/496 đạt** (71→75 test suite, +14 test mới), chạy trong ~19s — xác nhận sự cố treo suite đã được giải quyết triệt để, không phải né tránh tạm thời.
- **Không live-test được** `/metrics` qua HTTP thật lần này — Docker Desktop dừng hoạt động giữa phiên làm việc (đã dùng ở `SEC-002`/`PERF-001`/`002` trước đó, khác biệt với các task đó là không kịp khởi động lại trước khi phiên này kết thúc). Bù lại: `metrics.controller.spec.ts` assert trực tiếp đúng `response.setHeader`/`response.send` được gọi với Content-Type và nội dung Prometheus đúng — xác nhận logic đúng, nhưng chưa xác nhận qua một request HTTP thật đi qua toàn bộ pipeline Express/Nest thật. **Khuyến nghị**: xác minh sống việc này (`curl http://.../metrics` trên server thật) ở lần làm việc tiếp theo có Docker, trước khi coi `@Res()` là mẫu hình đã kiểm chứng đầy đủ cho các task sau.

## Cập nhật 2026-09-03 — live-test phát hiện bug thật, đã sửa

Docker hoạt động lại; chạy `node dist/main.js` thật (mượn tạm 7 file DI-fix từ nhánh Codex `codex/rel-001-local-build-smoke` để qua được lỗi boot chưa liên quan — xem `SEC-002`/`PERF-001,002`, revert lại ngay sau khi test xong) trỏ vào stack Docker đang chạy sẵn (`vmd-mnt001-verification-*`), rồi `curl` thật vào `/api/v1/metrics`:

- Format Prometheus, headers, `Content-Type: text/plain; charset=utf-8; version=0.0.4` đúng như thiết kế.
- Route-pattern cardinality control **xác nhận đúng qua traffic thật**: gọi `GET /api/v1/public/articles/some-test-slug` và `GET /api/v1/public/articles/another-slug` (hai slug khác nhau) → cả hai gộp vào **một** label `route="/api/v1/public/articles/:slug"` count=2, không tạo hai time series riêng.
- **Phát hiện bug thật**: request 404 (`GET /api/v1/public/articles/fix-verification-slug`) bị ghi nhận trong `/metrics` với `status="200"` thay vì `status="404"`. Nguyên nhân: `MetricsInterceptor` cũ dùng `tap({ next: record, error: record })`, đọc `response.statusCode` ngay tại thời điểm RxJS observable báo lỗi — nhưng exception filter của Nest (nơi thực sự set status code, ví dụ 404) chạy **sau** khi chuỗi interceptor đã unwind xong; tại thời điểm `tap`'s `error` chạy, `response.statusCode` vẫn là giá trị mặc định của Express (200), chưa được exception filter cập nhật.
- Đây đúng dạng lỗi mà unit test có sẵn (`metrics.interceptor.spec.ts`) **không thể bắt được**: test cũ tự set `res.statusCode = 401` trong mock rồi mới throw lỗi — enshrine đúng giả định sai, y hệt lớp lỗi tìm thấy ở `sepay-webhook.service.spec.ts` (`SEC-002`).
- **Sửa**: bỏ `tap`, chuyển sang lắng nghe sự kiện `response.on('finish', ...)` của Node — sự kiện này chỉ bắn ra khi response đã thực sự được gửi xong (sau khi exception filter, nếu có, đã set status code cuối cùng), đúng cho cả đường thành công lẫn đường lỗi, không cần đoán loại exception.
- Viết lại `metrics.interceptor.spec.ts` dùng `EventEmitter` thật thay cho object giả tĩnh, mô phỏng đúng thứ tự sự kiện thật (status code đổi sau khi interceptor đã xử lý xong lỗi, `finish` bắn sau đó) — test mới thất bại với code cũ, đạt với code mới. Thêm test case "không có `finish` thì không ghi nhận gì" (client abort).
- **Xác minh lại sau khi sửa**: cùng kịch bản 404 thật qua `curl` → `/metrics` trả đúng `status="404"`.
- `pnpm test`: 497/497 đạt (thêm 1 test case); `pnpm lint`, `pnpm typecheck`, `pnpm build`: đạt trên cả 12 package.

## Việc còn lại — cần chủ dự án

- **Chọn công cụ giám sát** (Prometheus tự host, Grafana Cloud, Datadog, hay khác) để scrape `/metrics` định kỳ và lưu trữ lịch sử — hiện tại `/metrics` chỉ có dữ liệu tức thời (reset khi restart process), không tự lưu.
- **Chọn kênh cảnh báo** (Slack webhook, PagerDuty, email...) và ngưỡng cảnh báo cụ thể (ví dụ: tỷ lệ lỗi 5xx bao nhiêu % thì báo, latency p99 bao nhiêu ms thì báo) — đây là quyết định nghiệp vụ/ngân sách, không tự chọn thay được.
- Khi có staging/production thật (`PRE-007`), nên xác nhận `/metrics` **không bị public Internet truy cập tự do** — quy ước chuẩn ngành là giới hạn ở tầng mạng (firewall/ingress rule cho phép riêng dải IP của hệ thống giám sát), không phải app-level auth (Prometheus scraper mặc định không gửi bearer token) — đây là việc hạ tầng/triển khai, ngoài phạm vi code.
