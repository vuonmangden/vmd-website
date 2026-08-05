# Test Plan — Vườn Măng Đen Phase 1

## 1. Mục đích

Tài liệu này quy định chiến lược kiểm thử xuyên suốt Phase 1 nhằm bảo đảm website, hệ thống quản trị, booking phòng, booking BBQ, thanh toán, notification và vận hành đạt yêu cầu trước khi phát hành.

Không xem một chức năng là hoàn thành chỉ vì giao diện hoạt động ở happy path. Mọi task phải có bằng chứng kiểm thử tương ứng với rủi ro.

## 2. Tài liệu tham chiếu

- `AGENTS.md`
- `docs/00_PROJECT_CONTEXT.md`
- `docs/01_PRD_PHASE_01.md`
- `docs/02_MASTER_TECHNICAL_ARCHITECTURE.md`
- `docs/03_TECHSPEC_PHASE_01.md`
- `docs/04_AI_CODING_EXECUTION_PLAN_PHASE_01.md`
- `docs/05_SECURITY_BASELINE_PHASE_01.md`
- `docs/06_AI_TASK_TEMPLATE.md`
- File task trong `docs/tasks/`

Nếu tài liệu tham chiếu chưa tồn tại hoặc có mâu thuẫn, task liên quan phải được đánh dấu `Blocked` và làm rõ trước khi triển khai.

## 3. Mục tiêu chất lượng

- Không double-booking phòng hoặc bàn trong các tình huống đồng thời.
- Booking và payment xử lý idempotent.
- Mọi giao dịch SePay hợp lệ được gắn đúng booking; giao dịch bất thường đi vào reconciliation.
- Không có đường dẫn vượt quyền phía server.
- Không lộ secret, token, dữ liệu thanh toán hoặc PII đầy đủ.
- Critical journey hoạt động trên mobile và desktop.
- Notification không gửi trùng, không gửi sai trạng thái và có thể retry an toàn.
- Migration có thể chạy từ database trắng và triển khai theo đúng thứ tự.
- Website đạt mục tiêu hiệu năng và capacity đã được Tech Spec chốt.

## 4. Phạm vi kiểm thử

### Trong phạm vi

- Public Web và Admin Web.
- NestJS API và worker.
- PostgreSQL/Prisma, Redis và queue.
- Supabase Auth/RLS khi được sử dụng.
- SePay, email và Zalo thông qua adapter, sandbox/mock và staging.
- CMS, room/rate/availability, booking, BBQ, payment, notification, operations, report và settings.
- Security, accessibility cơ bản, SEO kỹ thuật, backup/restore, observability và deployment.

### Ngoài phạm vi Phase 1

- AI Trip Planner và AI Concierge.
- Marketplace, tour và đối tác.
- Membership/loyalty đầy đủ.
- Đồng bộ OTA.
- Dynamic pricing nâng cao.

## 5. Cấp độ kiểm thử

### 5.1 Static checks

- Lint.
- Type check.
- Formatting/check conventions nếu repository cấu hình.
- Prisma/schema validation.
- Secret scan và dependency scan.
- Kiểm tra OpenAPI thay đổi khi API thay đổi.

### 5.2 Unit tests

Áp dụng cho business logic thuần:

- Price Engine, phụ thu, cọc, voucher và snapshot.
- Booking/BBQ state machine.
- Hold expiry và eligibility.
- Payment matching/reconciliation classification.
- Permission rules.
- Notification scheduling và deduplication.
- Date/time và timezone.

Unit test phải bao gồm happy path, boundary, invalid input và transition không hợp lệ.

### 5.3 Integration tests

Áp dụng cho ranh giới có database, queue hoặc provider adapter:

- Transaction, unique constraint và rollback.
- Concurrent occupancy/table allocation.
- Idempotency key và duplicate provider transaction.
- Outbox → queue → worker.
- Repository/service với PostgreSQL thật trong môi trường test.
- Redis TTL/lock nếu có; không dùng mock để chứng minh invariant database.
- SePay/email/Zalo adapter bằng mock server hoặc sandbox.
- Storage upload, policy và signed URL.

### 5.4 API contract tests

- Request/response đúng OpenAPI.
- Validation và error code ổn định.
- Authentication/authorization cho từng endpoint.
- Pagination, filtering, sorting và giới hạn kích thước.
- Idempotency, rate limit và correlation ID.

### 5.5 End-to-end tests

Ưu tiên critical journey:

1. Tìm phòng → quote → hold → booking → payment → confirmation.
2. Tìm bàn BBQ → chọn combo → booking → payment → confirmation.
3. Booking lookup bằng thông tin/link an toàn.
4. Admin đăng nhập → xem booking → thao tác được phép → audit.
5. Payment mismatch → reconciliation → xử lý theo quyền.
6. Booking đổi/hủy → occupancy và reminder được cập nhật.
7. CMS draft/publish → nội dung xuất hiện đúng trên Public Web.

### 5.6 Security tests

Theo `05_SECURITY_BASELINE_PHASE_01.md`, tối thiểu:

- Brute force, lockout, session expiry, logout/revocation và MFA.
- Role matrix, IDOR/BOLA, mass assignment và endpoint admin ẩn.
- SQL injection, XSS, CSRF, CORS, oversized payload và validation bypass.
- Upload giả MIME, double extension, file quá lớn và truy cập file riêng tư.
- Webhook giả, replay, duplicate và event sai thứ tự.
- Booking race, hold replay và idempotency conflict.
- Kiểm tra log/bundle không chứa secret hoặc PII đầy đủ.

### 5.7 UI, accessibility và compatibility

- Mobile-first tại các viewport được chốt; tối thiểu mobile nhỏ, mobile phổ biến, tablet và desktop.
- Chrome/Edge/Safari theo ma trận browser thực tế được chốt trước UAT.
- Keyboard navigation, focus visible, label, error message và contrast cho luồng chính.
- Loading, empty, validation, error, offline/timeout và retry state.
- Không có horizontal overflow hoặc CTA bị che trên mobile.

### 5.8 Performance, resilience và recovery

- Load test public browsing, availability, quote, booking, webhook và admin.
- Xác nhận p95, error rate, database pool, slow query, Redis, queue backlog và worker concurrency.
- Test provider timeout, queue retry, dead-letter và API partial failure.
- Backup restore và smoke test sau restore.
- Deployment rollback và migration compatibility khi cần.

## 6. Môi trường kiểm thử

| Môi trường | Mục đích | Dữ liệu | Provider |
|---|---|---|---|
| Local | Phát triển và kiểm thử nhanh | Seed giả an toàn | Mock/Mailpit |
| CI | Kiểm tra tự động, tái lập | Fixture cô lập | Mock |
| Staging | E2E, UAT, security, load có kiểm soát | Gần production nhưng không dùng PII thật | Sandbox/test account |
| Production | Smoke test có giới hạn và monitoring | Dữ liệu thật | Production |

- Không dùng chung secret/database/bucket giữa các môi trường.
- Test tự động không được gửi email/Zalo hoặc tạo giao dịch production.
- Dữ liệu test phải có thể reset an toàn ngoài production.

## 7. Quản lý dữ liệu test

- Seed deterministic cho phòng, bàn, rate, customer, booking và payment.
- UUID cố định hoặc factory có seed khi cần snapshot/contract test.
- Không sao chép PII production sang local/CI.
- Fixture thể hiện đủ ngày thường, cuối tuần, lễ, block, phụ thu và boundary check-in/check-out.
- Test concurrency dùng tài nguyên riêng và dọn dữ liệu có kiểm soát.
- Mỗi test độc lập; không phụ thuộc thứ tự chạy.

## 8. Ma trận kiểm thử theo module

| Module | Unit | Integration | API | E2E | Security | Performance |
|---|---:|---:|---:|---:|---:|---:|
| Foundation/API | Có | Có | Có | Smoke | Có | Có |
| IAM/RBAC | Có | Có | Có | Có | Bắt buộc | Có giới hạn |
| CMS/Media | Có | Có | Có | Có | Bắt buộc | Có |
| Room/Rate/Availability | Bắt buộc | Bắt buộc | Có | Có | Có | Bắt buộc |
| Booking | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc |
| Payment | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc |
| BBQ | Bắt buộc | Bắt buộc | Có | Bắt buộc | Bắt buộc | Có |
| Notification | Có | Bắt buộc | N/A | Có | Có | Có |
| Operations/Reports | Có | Có | Có | Có | Bắt buộc | Có |

## 9. Critical test scenarios

### Booking và occupancy

- Hai request đồng thời cố đặt cùng phòng/cùng ngày: chỉ một request thành công.
- Replay cùng `Idempotency-Key` và cùng payload: trả lại kết quả cũ, không tạo booking mới.
- Cùng key nhưng payload khác: từ chối bằng lỗi xác định.
- Hold hết hạn: không thể confirm; occupancy được giải phóng đúng một lần.
- Hủy/đổi lịch: occupancy cũ/mới thay đổi trong cùng transaction.
- Ngày checkout không bị tính là đêm lưu trú.

### Payment

- Webhook hợp lệ đúng tiền/mã/trạng thái: ghi nhận một lần.
- Replay cùng provider transaction: không cộng tiền hoặc đổi trạng thái lần hai.
- Thiếu tiền, thừa tiền, sai mã hoặc đến muộn: tạo reconciliation case.
- Webhook giả/không xác thực: bị từ chối và ghi log an toàn.
- Người dùng bấm “đã chuyển khoản”: không tự xác nhận payment.

### Notification

- Booking hợp lệ nhận đúng confirmation/reminder.
- Booking hủy không nhận reminder.
- Booking đổi ngày không nhận reminder lịch cũ.
- Retry không gửi trùng khi provider timeout sau khi đã nhận request.
- Lỗi notification không rollback booking/payment hợp lệ.

### Authorization

- Mỗi role chỉ xem/thao tác đúng quyền.
- User không thể thay ID để truy cập booking/customer/payment khác.
- Thao tác tài chính, role và settings đều có audit.
- Tài khoản khóa hoặc session hết hạn không truy cập được API admin.

## 10. Tiêu chí pass/fail

### Task gate

Task chỉ được chuyển `Review` khi:

- Tất cả acceptance criteria có test hoặc bằng chứng kiểm thử.
- Lint, type check, build và test liên quan đạt.
- Không skip/xóa test để qua CI.
- Không còn lỗi security critical/high do task tạo ra.
- Migration và OpenAPI hợp lệ khi liên quan.

### Milestone gate

- Toàn bộ task bắt buộc của milestone đạt `Done`.
- Integration/E2E theo gate trong Execution Plan đạt.
- Không còn blocker hoặc defect P0/P1 chưa có quyết định.
- Regression suite liên quan xanh.

### Production gate

- Critical E2E và role matrix đạt trên staging.
- Security review ASVS Level 2 hoàn tất.
- Load/capacity test đạt ngưỡng đã chốt.
- Backup restore và rollback đã diễn tập.
- Không còn defect P0/P1; P2 còn lại có owner và kế hoạch.

## 11. Phân loại lỗi

| Mức | Định nghĩa | Ví dụ | Xử lý |
|---|---|---|---|
| P0 Critical | Mất dữ liệu, lộ secret/PII nghiêm trọng, double-booking diện rộng, sai tiền | Bypass auth, ghi nhận payment hai lần | Dừng release, sửa ngay |
| P1 High | Critical journey không dùng được hoặc vượt quyền đáng kể | Không đặt phòng, webhook không xử lý | Không release |
| P2 Medium | Có workaround, ảnh hưởng một phần | Bộ lọc sai, notification chậm | Có owner trước release |
| P3 Low | Lỗi nhỏ về nội dung/thẩm mỹ | Spacing, typo | Đưa backlog có ưu tiên |

## 12. Báo cáo bằng chứng

Mỗi task/PR phải ghi:

- Lệnh đã chạy và kết quả thực tế.
- Test case mới/thay đổi.
- Ảnh/video UI khi liên quan.
- Migration đã thử trên database trắng hoặc staging.
- Security impact và các test bảo mật đã chạy.
- Nội dung chưa kiểm tra được, lý do và owner.

## 13. Trách nhiệm

- **Người viết task:** bảo đảm acceptance criteria và test requirements đủ rõ.
- **AI coding/developer:** viết và chạy test, báo cáo trung thực, không tự giảm yêu cầu.
- **Reviewer:** kiểm tra diff, invariant, quyền, migration và bằng chứng test.
- **Product Owner/Operations:** thực hiện UAT nghiệp vụ và chốt chính sách/dữ liệu.
- **Người phụ trách production:** xác nhận security, backup, monitoring, rollback và go-live checklist.

## 14. Checklist UAT Phase 1

- [ ] Homepage, phòng, BBQ, blog, liên hệ và chính sách hiển thị đúng trên mobile.
- [ ] Khách hoàn tất booking phòng và BBQ với dữ liệu thực đã chốt.
- [ ] Giá, phụ thu, cọc, giảm giá và số tiền còn lại hiển thị đúng.
- [ ] Thanh toán/đối soát đúng các trường hợp chuẩn và bất thường.
- [ ] Email/Zalo và T-7/T-3/T-1 đúng nội dung, thời điểm và trạng thái.
- [ ] Lễ tân, kế toán, marketing, quản lý và admin chỉ thấy đúng quyền.
- [ ] Hủy/đổi/check-in/check-out phản ánh đúng lịch và báo cáo.
- [ ] Audit, export, log masking và error handling đạt yêu cầu.
- [ ] Backup, restore, alert và runbook đã được xác nhận.

## 15. Nội dung cần chốt sau khi repository được khởi tạo

- Lệnh chính xác cho lint, type check, test, E2E và build.
- Framework test và browser automation chính thức.
- Ngưỡng coverage theo nhóm module; không dùng coverage thay thế chất lượng test.
- Browser/device support matrix.
- Mục tiêu p95, throughput, error rate và thời lượng soak test.
- Công cụ SAST/DAST/dependency/secret scanning.
- Owner phê duyệt UAT và production gate.

