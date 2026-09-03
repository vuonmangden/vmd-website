# SEC-002 — Security Testing (SAST/DAST/manual)

**Ngày:** 2026-09-03 · **Thực hiện:** Claude · **Phụ thuộc:** `SEC-001` (Done)

## Tóm tắt — đây là phần khác biệt so với SEC-001

`SEC-001` là code review tĩnh. `SEC-002` lần đầu tiên **thực sự chạy server thật** (Docker đã sẵn sàng trong phiên này) và gửi HTTP request thật vào — DAST/manual đúng nghĩa, không phải đọc code suy luận hành vi. Kết quả: phát hiện **2 lỗi Critical hoàn toàn mới** mà cả code review lẫn toàn bộ unit test hiện có (482 test) đều không bắt được, vì cả hai đều thuộc loại lỗi chỉ lộ ra khi có một dependency thật (BullMQ thật, hoặc pipeline validation thật của NestJS) — thứ mà mock trong unit test che giấu hoàn toàn. Cả hai đã được sửa và xác minh lại bằng cách gọi API thật lần thứ hai sau khi sửa.

## Phương pháp

1. **Hạ tầng**: dùng lại stack Docker `vmd-mnt001-verification-*` đã chạy sẵn từ phiên trước (Postgres/Redis/MinIO/Mailpit/mock-SePay/mock-Zalo, đúng port `.env.example`) thay vì dựng stack mới (tránh xung đột cổng). Áp toàn bộ 30 migration (đã sẵn, `prisma migrate status` xác nhận "up to date"), seed lại catalog production (`prisma/seed.ts`: 7 phòng, 3 khu BBQ/30 bàn, 76 món, RBAC matrix).
2. **Build & chạy thật**: `pnpm --filter @vmd/api run build` rồi `node dist/main.js` với biến môi trường từ `.env` (giá trị giả lập cục bộ, không phải secret thật) — đây là cách gần nhất với production thật trong khả năng của phiên này (không qua `nest start --watch`).
3. **DAST**: gửi HTTP request thật (`curl`) vào từng nhóm endpoint — public booking/BBQ/webhook, admin (không có token), health/docs — kiểm tra header, mã lỗi, nội dung response, và **hành vi thật** (rate limit có chặn thật không, idempotency có hoạt động thật không, double-booking có bị chặn thật không).
4. **SAST**: `pnpm audit --prod --audit-level high` (0 Critical/High sau khi vá `fast-uri` — xem PR #108), ESLint + `tsc --noEmit` strict (đã chạy liên tục qua CI, xác nhận lại thủ công).
5. **Manual**: thử các payload cố tình sai định dạng/thiếu field để xem lỗi có rò rỉ thông tin nội bộ không, thử vượt rate limit, thử double-booking, thử webhook không có/sai API key.

## Vướng mắc đáng chú ý: server không boot được nếu thiếu bản vá REL-001

Lần chạy `node dist/main.js` đầu tiên **crash ngay khi khởi động** — `UnknownDependenciesException` tại `ResourceHoldsService`. Đây từng bị một phiên trước (`BBQ-005`) gán nhầm là "lỗi môi trường cục bộ, không liên quan tới task đó". Thực ra đây là lỗi thật: constructor `ResourceHoldsService(prisma, now = () => new Date(), holdMinutes = configuredHoldMinutes())` khiến NestJS DI cố inject tham số kiểu `Function`/`Object` (không có provider nào khớp) — **crash 100% mọi lần khởi động thật**, chỉ "hoạt động" trong unit test vì test luôn `new` trực tiếp, không qua NestJS DI. Kiểm tra thấy PR #95 (`codex/rel-001-local-build-smoke`, Codex đang làm) đã sửa đúng lỗi này (thêm `@Optional() @Inject(TOKEN)`) trên 7 file. Để tiếp tục test sống, đã **mượn tạm 7 file đã sửa của PR #95 chỉ để chạy thử cục bộ** (không commit, không push, đã `git checkout HEAD --` khôi phục lại trước khi commit bất kỳ gì) — xác nhận lại bằng cách khởi động lại server sau khi khôi phục và thấy đúng lỗi cũ quay lại, chứng minh không còn sót file mượn nào trong commit này. Không sửa 7 file đó trong PR này vì đã là phạm vi đang làm của Codex.

---

## 1. CRITICAL (mới, đã sửa) — Webhook SePay crash ở MỌI lần gọi hợp lệ vì BullMQ từ chối job ID

**File:** `apps/api/src/modules/payments/sepay-webhook.service.ts`

Gọi `POST /webhooks/sepay/transactions` với API key đúng và payload hợp lệ → **500 Internal Server Error** trên server thật. Log: `Error: Custom Id cannot contain :` từ chính thư viện BullMQ.

**Nguyên nhân:** `jobId: \`sepay:${payload.id}\`` — BullMQ chỉ chấp nhận dấu `:` trong custom `jobId` nếu tách theo `:` ra đúng 3 phần (quy tắc tương thích ngược cho ID của repeatable job nội bộ BullMQ). `sepay:${payload.id}` tách ra 2 phần → luôn ném lỗi, không phụ thuộc giá trị `payload.id`. Đã xác nhận đây là hằng số hành vi của BullMQ (đọc trực tiếp `job.js` trong `node_modules`), không phải giả định.

**Vì sao không bị 482 unit test hiện có bắt được:** `sepay-webhook.service.spec.ts` mock `queue.add = jest.fn()` — mock nhận bất kỳ chuỗi nào, không bao giờ chạy `Job.validateOptions()` thật của BullMQ. Test cũ thậm chí **assert đúng giá trị lỗi** (`jobId: 'sepay:sepay-event-1'`) như thể đó là hành vi đúng.

**Tác động nếu chưa sửa:** Ngay khi `PAY-007` mở khóa production, **mọi webhook SePay hợp lệ đều crash** — dòng `payment_webhook_events` vẫn được ghi (insert xảy ra trước lỗi) nhưng job xử lý xác nhận thanh toán không bao giờ được tạo → khách chuyển tiền xong nhưng booking/BBQ reservation không bao giờ tự chuyển sang `CONFIRMED`. Đây là lỗi nghiêm trọng nhất có thể xảy ra cho luồng thanh toán.

**Bản sửa:** đổi sang `sepay-${payloadId.replaceAll(':', '_')}` (bỏ hẳn dấu `:`, đồng thời khử luôn dấu `:` nếu chính `payload.id` — dữ liệu từ provider bên ngoài — vô tình chứa nó). Verify: (a) test mới gọi thẳng `bullmq`'s `Job.validateOptions()` thật (không mock) để xác nhận jobId mới hợp lệ và jobId cũ thật sự bị từ chối; (b) gọi lại `POST /webhooks/sepay/transactions` trên server thật sau khi sửa → **201, `{"received":true,"duplicate":false}`, log sạch, không lỗi**.

---

## 2. CRITICAL (mới, đã sửa) — Toàn bộ tra cứu booking công khai không hoạt động vì `import type` xóa mất metadata validate

**File:** `apps/api/src/modules/rooms/booking-lookup.controller.ts`

Gọi `POST /public/booking-lookup` với `{bookingCode, phone}` đúng định dạng DTO → **400 VALIDATION_ERROR: "property bookingCode should not exist", "property phone should not exist"** — bị từ chối dù đúng field.

**Nguyên nhân:** dòng `import type { BookingLookupDto, PublicGuestRequestDto, DecideGuestRequestDto, ReviewGuestRequestDto } from './dto/booking-lookup.dto';` — import kiểu `type`, bị xóa hoàn toàn lúc biên dịch. NestJS's `ValidationPipe` cần **class thật** lúc chạy (qua `design:paramtypes` reflection) để biết cấu trúc nào hợp lệ cho `@Body()`; thiếu class thật, pipe không nhận diện được field nào — `whitelist: true` + `forbidNonWhitelisted: true` từ chối mọi field gửi lên. Mọi file `.controller.ts` khác trong repo đều import DTO kiểu value kèm comment bắt buộc `// eslint-disable-next-line ... -- Nest needs runtime DTO metadata for validation.` — quy ước đã có sẵn, chỉ riêng file này thiếu, có lẽ do refactor/auto-fix ESLint từng chạy mà không có comment chặn. Grep toàn repo xác nhận đây là file `.controller.ts` DUY NHẤT mắc lỗi này.

**Vì sao không bị unit test bắt được:** `booking-lookup.service.spec.ts` test thẳng `BookingLookupService` (constructor tay), không đi qua `BookingLookupController`/HTTP/`ValidationPipe` — lớp lỗi này chỉ lộ ra ở ranh giới HTTP thật.

**Tác động nếu chưa sửa:** **Toàn bộ 3 endpoint công khai** của controller này (`/public/booking-lookup`, `/public/booking-lookup/requests`, `/public/booking-lookup/printable`) — tính năng tự tra cứu booking, gửi yêu cầu hủy/đổi ngày của khách (`BKG-007`) — **không dùng được**, bất kể dữ liệu đúng hay sai.

**Bản sửa:** đổi thành value import kèm đúng comment quy ước đã có sẵn trong repo. Verify: gọi lại `POST /public/booking-lookup` trên server thật → xử lý đúng, trả `404 BOOKING_NOT_FOUND` hợp lý (không có booking khớp trong DB test) thay vì `400` sai; gọi lặp lại 6 lần cùng IP → **lần thứ 6 nhận đúng `429`** (rate limit `booking-lookup-rate-limit.service.ts` hoạt động thật, không chỉ đúng trong mock).

---

## 3. Low (mới, đã sửa) — `X-Powered-By: Express` lộ trong mọi response thật

Không thấy qua code review (không có middleware/header nào chủ động thêm nó — đây là default của Express, chỉ lộ ra khi có response thật). Thông tin công khai framework/version, rủi ro thấp (reconnaissance) nhưng miễn phí để tắt. **Đã sửa**: `app.getHttpAdapter().getInstance().disable('x-powered-by')` trong `main.ts`, cùng chỗ với `trust proxy`.

---

## 4. Xác nhận sống các phát hiện "Pass" của SEC-001 (DAST xác nhận đúng, không chỉ đúng trên giấy)

| Kiểm tra | Cách test | Kết quả |
|---|---|---|
| CSP/HSTS/X-Frame-Options/... | `curl -i` bất kỳ endpoint | Đầy đủ, đúng như code — **Pass** |
| CORS chặn origin lạ | `curl -H "Origin: evil.example.com"` | Không có `Access-Control-Allow-Origin` — **Pass** |
| Admin endpoint không token | `curl` không header | `401 AUTHENTICATION_FAILED`, body sạch không rò thông tin — **Pass** |
| SePay webhook sai/thiếu key | `curl` sai `Authorization` | `401 WEBHOOK_UNAUTHORIZED`, không phân biệt sai-key/thiếu-key — **Pass** |
| Chống double-booking | Đặt 2 booking cùng phòng/ngày, key khác nhau | Booking 2 nhận `409 ROOM_UNAVAILABLE` — **Pass** |
| Idempotency booking | Gửi lại đúng key+payload | Trả về đúng booking cũ (cùng `bookingCode`), không tạo bản ghi mới — **Pass** |
| Rate limit booking-lookup | 6 request liên tiếp cùng IP | Request thứ 6 nhận `429` — **Pass** (chỉ verify được sau khi sửa mục 2 ở trên) |
| Swagger `/api/docs` công khai | `curl` không auth | `200` — xác nhận đúng phát hiện Informational đã ghi ở SEC-001, không phải lỗi mới |

## SAST

`pnpm audit --prod --audit-level high`: 0 Critical/High (đã vá `fast-uri` — xem tracker), 6 Moderate còn lại (không chặn gate, đã biết từ trước). ESLint + `tsc --noEmit` strict: đạt. Không chạy thêm công cụ SAST bên ngoài (semgrep...) vì codebase đã có TypeScript strict + ESLint nghiêm ngặt + `pnpm audit` chạy liên tục qua CI — thêm công cụ mới cần cài đặt/cấu hình ngoài phạm vi một lần quét.

## Kết quả gate

`pnpm --filter @vmd/api run lint/typecheck/test/build` đều đạt (482/482 test, 1 test mới — regression thật cho bug BullMQ). Đã khôi phục sạch 7 file mượn tạm của PR #95 trước khi commit (xác nhận bằng `git status`).

## Việc còn lại ngoài phạm vi

- Không test được luồng có xác thực (đăng nhập staff, admin panel) vì môi trường cục bộ không có Supabase project thật (`SUPABASE_URL`/`SUPABASE_ANON_KEY` không có trong `.env.example`, đúng như `PRE-007` đã ghi nhận) — `AuthConfigService` fail-closed 503 đúng như thiết kế khi thiếu cấu hình, đã xác nhận qua log nhưng chưa test được luồng thật.
- Load test (`PERF-001`) và test DAST có công cụ tự động (OWASP ZAP...) chưa làm — phiên này thiên về manual/exploratory testing có mục tiêu rõ ràng hơn là quét tự động diện rộng.
- Chưa test worker app (`apps/worker`) sống — ngoài phạm vi vì các bug tìm được đều nằm ở `apps/api`.
