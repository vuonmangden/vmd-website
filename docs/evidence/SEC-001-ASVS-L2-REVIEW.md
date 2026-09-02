# SEC-001 — OWASP ASVS 4.0.3 Level 2 Review

**Ngày:** 2026-09-02 · **Thực hiện:** Claude · **Phạm vi:** `apps/api/src/modules/auth` (IAM), `apps/api/src/modules/payments` (PAY), `apps/api/src/modules/rooms` + `apps/api/src/modules/bbq` (BKG), cấu hình cross-cutting (`main.ts`, `common/security`, `common/filters`, `common/interceptors`). Review mã nguồn tĩnh (read-only), không có môi trường staging chạy được trong phiên này nên không bao gồm DAST/pentest thủ công (thuộc `SEC-002`).

## Phương pháp

Rà soát theo các nhóm control liên quan nhất của ASVS 4.0.3 Level 2 cho một ứng dụng đặt phòng/thanh toán: V2 (Authentication), V3 (Session Management), V4 (Access Control), V5 (Validation), V7 (Error Handling & Logging), V8 (Data Protection), V9 (Communications), V11 (Business Logic), V13/V14 (API & Configuration). Ba mảng IAM/PAY/BKG được giao cho 3 sub-agent độc lập rà soát song song theo checklist chi tiết; cross-cutting config do tôi tự đọc trực tiếp. Mỗi phát hiện được yêu cầu có bằng chứng `file:line` cụ thể và một kịch bản khai thác thật, không chỉ suy đoán — phân biệt rõ lỗ hổng thật với giới hạn đã biết/đã ghi chú trong code.

## Tóm tắt mức độ nghiêm trọng

| Mức độ | Số lượng | Đã sửa trong PR này |
|---|---|---|
| Critical | 1 | ✅ |
| High | 1 | ✅ |
| Medium | 5 | 3 sửa, 2 ghi nhận (cần quyết định hạ tầng/sản phẩm) |
| Low | ~10 | 2 sửa, còn lại ghi nhận |
| Informational | ~8 | Ghi nhận |

**Không có phát hiện nào ở mức Critical/High trong PAY** — pipeline xác nhận thanh toán (idempotency, đối chiếu số tiền, transaction) được xây dựng và test tốt. Phát hiện Critical/High duy nhất nằm ở BKG.

---

## 1. CRITICAL — Cơ chế tự hết hạn booking/BBQ tồn tại nhưng không bao giờ được gọi

**Trạng thái: Đã sửa.**

`PaymentsService.expireDue()`/`expireOne()` (`apps/api/src/modules/payments/payments.service.ts:96-125`) và `ResourceHoldsService.expireDue()` (`apps/api/src/modules/rooms/resource-holds.service.ts:17-19`) đã được viết đầy đủ và có unit test, nhưng **không có nơi nào trong toàn bộ codebase gọi đến chúng** — không `@Cron`, không worker consumer, không route. Hai queue BullMQ `BOOKING_HOLD_EXPIRY`/`BBQ_HOLD_EXPIRY` đã được đăng ký sẵn trong `queue.module.ts` nhưng chưa từng có producer/processor nào dùng đến — hạ tầng dở dang, không phải chủ đích.

**Kịch bản khai thác:** Một khách vãng lai (không cần đăng nhập) gọi `POST /public/room-bookings` với thông tin hợp lệ về định dạng nhưng không bao giờ thanh toán. Booking treo ở `PENDING_PAYMENT` vĩnh viễn — theo `BookingStateService`, lối ra hợp lệ duy nhất từ `PENDING_PAYMENT` là `EXPIRED`, nhưng `AdminBookingsService`'s `ADMIN_TRANSITIONS` không cho phép chuyển sang `EXPIRED`, và khách tự hủy qua `booking-lookup` cũng yêu cầu trạng thái `CONFIRMED`. Kết quả: **không có đường nào — kể cả nhân viên — để giải phóng phòng/ngày đó qua API**, chỉ có thể sửa trực tiếp trong DB. Lặp lại thao tác này cho từng phòng/ngày có thể khóa toàn bộ tồn phòng tương lai mà không cần xác thực, tự động hóa được hoàn toàn.

**Bản sửa:** Thêm `HoldExpirySweepService` (`apps/api/src/modules/rooms/hold-expiry-sweep.service.ts`), đăng ký trong `RoomsModule` (đã import sẵn `PaymentsModule` nên không có circular dependency; `ResourceHoldsService` cũng thuộc `RoomsModule`). Dùng `setInterval` trong `OnModuleInit`/`OnModuleDestroy` — mirror đúng pattern đã có sẵn và đã test kỹ ở `apps/worker/src/notification/reminder-scan.service.ts`, không thêm dependency `@nestjs/schedule` mới, không dùng lại 2 queue BullMQ đã đăng ký sẵn vì ngữ nghĩa dự kiến ban đầu của chúng không có tài liệu ghi lại (dùng nhầm mục đích rủi ro hơn lợi ích). Chu kỳ quét: 5 phút — đủ nhanh để giới hạn "cửa sổ phantom-lock" sau khi hết hạn thực tế, không tạo tải DB đáng kể. `sweep()` gọi cả `PaymentsService.expireDue()` (giải phóng booking VÀ BBQ reservation có payment intent PENDING_PAYMENT gắn kèm — hàm này đã tự xử lý cả hai loại) và `ResourceHoldsService.expireDue()`. Test: `hold-expiry-sweep.service.spec.ts` (3 test, bao gồm cơ chế lặp lại theo interval và dừng đúng lúc `onModuleDestroy`).

**Lưu ý:** BBQ reservation ở trạng thái `PENDING_CONFIRMATION` (nhóm 5-20 khách, chưa đặt cọc, chờ lễ tân xác nhận thủ công) **không** có payment intent nên không được sweep này giải phóng — xem mục 2 bên dưới.

---

## 2. HIGH — Endpoint tạo BBQ reservation công khai không có rate limit

**Trạng thái: Đã sửa (phần rate limit). Phần "PENDING_CONFIRMATION không tự hết hạn" — ghi nhận, cần quyết định sản phẩm.**

`public-bbq-reservations.controller.ts` không gọi bất kỳ rate-limit nào, khác với endpoint booking phòng tương đương (`PublicBookingRateLimitService`, đã có sẵn `this.rateLimit.check(request.ip)`). Hạn ngạch khách/ngày cố định là 120 (`DAILY_QUOTA`), tối đa 20 khách/request — 6 request không xác thực (mỗi request kèm `Idempotency-Key` mới) là đủ để chiếm hết hạn ngạch một ngày bất kỳ, chặn khách thật đặt BBQ ngày đó cho tới khi lễ tân tìm và hủy thủ công từng reservation giả.

**Bản sửa:** Thêm `PublicBbqRateLimitService` (`apps/api/src/modules/bbq/public-bbq-rate-limit.service.ts`) — mirror chính xác `PublicBookingRateLimitService` (5 request/phút/IP, hash SHA-256 IP, tự dọn Map định kỳ), đăng ký trong `BbqModule`, gọi `this.rateLimit.check(request.ip)` trong `PublicBbqReservationsController.create()` trước khi vào service. Test: `public-bbq-rate-limit.service.spec.ts`.

**Chưa sửa (cần quyết định sản phẩm):** `PENDING_CONFIRMATION` reservation không có payment intent nên sweep ở mục 1 không đụng tới — nếu một request nhóm không hợp lệ/không phải khách thật được lễ tân bỏ qua (không xác nhận cũng không hủy), nó chiếm hạn ngạch vô thời hạn. Việc tự động hết hạn các request này cần một quyết định về **thời hạn chờ xác nhận hợp lý** (ví dụ 24h/48h) — đây là quyết định nghiệp vụ, không phải lỗi kỹ thuật, nên không tự ý thêm logic mà chưa xác nhận với chủ dự án. Đề xuất: thêm vào backlog cùng nhóm `BBQ-007` hoặc một task riêng.

---

## 3. MEDIUM — BBQ reservation date không có giới hạn "không được là ngày quá khứ"

**Trạng thái: Đã sửa.**

Room booking (`public-bookings.service.ts:36`) đã chặn `checkIn` trước ngày hiện tại (múi giờ Asia/Ho_Chi_Minh), nhưng BBQ (`public-bbq-reservations.service.ts`) không có kiểm tra tương đương — chỉ có `assertWithinServiceHours()` (kiểm tra khung giờ phục vụ, không kiểm tra ngày quá khứ). Có thể tạo reservation với ngày trong quá khứ nếu ngày-trong-tuần đó khớp với một `BbqServiceSlot` đang active, gây dữ liệu vô nghĩa và làm nhiễu hạn ngạch của ngày đó.

**Bản sửa:** Thêm `operationalToday()` helper (mirror đúng công thức `operationalDate()` bên `public-bookings.service.ts`, +7h UTC rồi cắt về `YYYY-MM-DD`) và kiểm tra `dto.date < operationalToday(this.now())` trong `public-bbq-reservations.service.ts`, ngay cạnh các validation đồng bộ khác. Test: 2 test case mới trong `public-bbq-reservations.service.spec.ts` (từ chối ngày hôm qua, chấp nhận ngày hôm nay).

---

## 4. MEDIUM — Audit log `staff.invited` lưu email không che (PII)

**Trạng thái: Đã sửa.**

`AuditService.record()` (`apps/api/src/modules/audit/audit.service.ts`) đã có sẵn cơ chế redact theo regex `/password|token|otp|secret|authorization|cookie|email|phone|identity|account/i` áp lên key của object trước khi lưu — đúng theo yêu cầu `docs/tasks/IAM-004.md §3` ("Không lưu password, token, OTP, secret hoặc PII đầy đủ"). Nhưng `staff-management.service.ts:50-59` (hàm `invite()`) tự gọi `tx.auditLog.create()` trực tiếp bên trong một `$transaction` đang mở (không dùng được `AuditService.record()` vì service đó dùng `this.prisma` riêng, không nhận `tx`), nên bỏ sót redact — `afterData: { email, fullName, status: 'INVITED' }` lưu email dạng plaintext.

**Bản sửa:** Export hàm `sanitize()` sẵn có từ `audit.service.ts` (trước đó là hàm nội bộ), import và bọc `afterData` tại `staff-management.service.ts`'s `invite()`: `afterData: sanitize({ email, fullName, status: 'INVITED' })`. Ba lệnh `tx.auditLog.create()` còn lại trong `staff-management.service.ts`/`roles.service.ts` không chứa field khớp regex (chỉ `status`/`roleCode`) nên không cần sửa. Test: cập nhật `staff-management.service.spec.ts` để assert `afterData.email === '[REDACTED]'`.

---

## 5. LOW — Đếm "Super Admin cuối cùng" khi thu hồi vai trò không loại staff không hoạt động

**Trạng thái: Đã sửa.**

`roles.service.ts`'s `revokeRole()` (dòng 60-64 cũ) đếm **mọi** `staffRoleAssignment` có `roleId` = SUPER_ADMIN, không lọc theo `staffProfile.status`, khác với guard tương đương và đúng hơn ở `staff-management.service.ts`'s `changeStatus()` (dòng 178-197, có lọc `staff: { status: 'ACTIVE' }`). Kịch bản: SUPER_ADMIN A (ACTIVE) và B (SUSPENDED) — đếm ra 2, nên thu hồi vai trò của A (Super Admin ACTIVE duy nhất còn lại) vẫn được cho phép vì B (không dùng được) vẫn được tính. Đã xác minh: **chưa khai thác được thành lỗ hổng thật trong một lần gọi đơn lẻ** vì `revokeRole` cũng chặn tự-đổi-chính-mình (actor luôn phải là một Super Admin khác đang thao tác, nên actor đó luôn sống sót qua chính lệnh gọi của mình) — nhưng đây vẫn là một lỗi số học sai, sai một bước refactor là thành lockout thật.

**Bản sửa:** Thêm điều kiện `staff: { status: 'ACTIVE' }` vào `count()`, khớp đúng pattern đã đúng ở `staff-management.service.ts`. Test: thêm test case trong `roles.service.spec.ts` xác minh `count` được gọi với đúng `where` clause lọc theo status.

---

## Các phát hiện khác — ghi nhận, chưa sửa trong PR này

Danh sách đầy đủ dưới đây được giữ lại cho lần review tiếp theo hoặc để chủ dự án quyết định độ ưu tiên. Không sửa vì: (a) cần quyết định hạ tầng/kiến trúc ngoài phạm vi một PR code review, (b) đã được ghi nhận và lên kế hoạch ở task khác (`PAY-007`), hoặc (c) mức độ Informational không đủ giá trị để thay đổi ngay.

### IAM
- **[Medium]** Rate limiter đăng nhập (`login-rate-limit.service.ts`) lưu trong bộ nhớ per-process — không dùng chung được giữa nhiều instance, reset khi restart. Cần quyết định hạ tầng (Redis) trước khi scale ngang; đã có tiền lệ ghi nhận tương tự ở `MNT-001.md` cho rate limiter khác.
- **[Medium]** Logout chỉ thu hồi refresh token phía Supabase, không vô hiệu hóa access token đã cấp (verify là stateless, không có revocation list). Access token bị lộ vẫn dùng được tới khi tự hết hạn dù người dùng đã logout. Cần quyết định kiến trúc (TTL ngắn hơn + rotation, hoặc danh sách thu hồi).
- **[Low]** `/auth/refresh` không có rate limit (login có). 
- **[Low]** Audit log của `staff-management.service.ts`/`roles.service.ts` không ghi `ipAddress`/`userAgent` dù model đã có cột — cần truyền `Request` qua chuỗi gọi controller→service, phạm vi rộng hơn nên để lại.
- **[Informational]** `PermissionsGuard` mặc định cho qua (fail-open) nếu handler không có `@RequirePermissions` — hiện tại mọi endpoint nhạy cảm đều khai báo đúng, nhưng đây là một "bẫy" cho endpoint tương lai nếu quên khai báo.

### PAY
- **[Low]** Endpoint webhook SePay không có rate limit riêng (mọi endpoint public khác đều có). Rủi ro thấp vì production đang fail-closed (chờ `PAY-007`) và request auth-fail bị từ chối trước khi ghi DB.
- **[Low]** `findIntentForTransfer` khớp theo substring trên toàn bộ payment intent, không giới hạn `PENDING`/chưa hết hạn — an toàn về tài chính (rơi về reconciliation thủ công thay vì tự xác nhận sai) nhưng kém chính xác.
- **[Low → khuyến nghị Medium khi có dữ liệu thật]** Payload webhook thô (sẽ chứa số tài khoản ngân hàng thật khi `PAY-007` triển khai production) lưu nguyên văn không che, không có chính sách retention. Đề xuất `PAY-007` xử lý cùng lúc mở khóa production.
- **[Informational]** Cột `signatureValid` luôn hardcode `true` — tên cột có thể gây hiểu nhầm là có xác thực chữ ký thật, trong khi thiết kế hiện tại xác thực bằng API key tĩnh.

### BKG
- **[Low/Medium]** Rate limiter booking-lookup và booking-creation cũng in-memory/per-process — cùng nhóm giới hạn với IAM ở trên, đã ghi nhận từ trước ở `MNT-001.md`.
- **[Low, Informational]** Public BBQ availability search trả về ID/mã bàn vật lý thật, không nhất quán với chủ đích "không lộ tồn kho vật lý" đã nêu rõ ở phía room booking.
- **[Informational]** `PENDING_PAYMENT → CONFIRMED` (webhook) đi một đường riêng, không qua `BookingStateService` — vẫn an toàn (có điều kiện `where` riêng) nhưng là hai nguồn sự thật cho cùng một state machine, nên hợp nhất khi có dịp.
- **[Informational]** `BookingCreationService` (mã booking entropy yếu hơn, 32-bit) là dead code, không route nào gọi tới — an toàn vì không thể truy cập nhưng nên dọn nếu chắc chắn không dùng.

---

## Cross-cutting (đọc trực tiếp `main.ts`, `common/security`, `common/filters`, `common/interceptors`)

**Verdict: Pass**, không có phát hiện. Đáng ghi nhận vì đã được xây sẵn tốt hơn kỳ vọng:
- CORS allowlist nghiêm ngặt qua `SecurityConfigService`, validate từng origin (bắt buộc HTTPS trừ localhost, không path/query/credential trong origin), fail-closed nếu thiếu cấu hình ở production.
- Đầy đủ security header: CSP chặt (`default-src 'self'`, không `unsafe-inline` cho script), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, HSTS ở production.
- `AllExceptionsFilter` không bao giờ lộ stack trace/chi tiết lỗi nội bộ ra response — luôn generic `INTERNAL_ERROR`, log đầy đủ chỉ ở server kèm `correlationId`.
- `CorrelationIdInterceptor` validate correlation ID theo regex UUID nghiêm ngặt trước khi tin/phản chiếu lại — chặn log injection qua header này.
- `ValidationPipe` toàn cục với `whitelist: true, forbidNonWhitelisted: true` — chặn mass-assignment, không DTO public nào chấp nhận field giá/trạng thái từ client.
- Không tìm thấy secret hardcode nào trong `apps/` qua grep theo pattern (API key, private key, password literal).

---

## File đã thay đổi trong PR sửa lỗi đi kèm review này

- `apps/api/src/modules/rooms/hold-expiry-sweep.service.ts` (mới) + `.spec.ts`, đăng ký trong `rooms.module.ts`
- `apps/api/src/modules/bbq/public-bbq-rate-limit.service.ts` (mới) + `.spec.ts`, đăng ký trong `bbq.module.ts`, gọi từ `public-bbq-reservations.controller.ts`
- `apps/api/src/modules/bbq/public-bbq-reservations.service.ts` (+ `.spec.ts`) — thêm chặn ngày quá khứ
- `apps/api/src/modules/audit/audit.service.ts` — export `sanitize()`
- `apps/api/src/modules/auth/staff-management.service.ts` (+ `.spec.ts`) — redact email trong audit log mời nhân viên
- `apps/api/src/modules/auth/roles.service.ts` (+ `.spec.ts`) — sửa điều kiện đếm Super Admin đang hoạt động

Toàn bộ đạt lint/typecheck/test (458/458, 12 test mới)/build cho `@vmd/api`.
