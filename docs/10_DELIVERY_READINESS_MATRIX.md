# Delivery Readiness Matrix — Phase 1

## 1. Mục đích

Matrix này là gate thực thi hiện hành sau rebaseline ngày 2026-09-01. Nó phân biệt rõ code đã merge với khả năng chạy production: trạng thái `Done` trong tracker chỉ xác nhận task implementation đã merge và qua CI, không tự động xác nhận production-ready.

## 2. Trạng thái quyền thực thi

- `BLOCKED`: thiếu quyết định, secret hoặc hạ tầng bắt buộc; không được bật production.
- `PLANNING_ONLY`: chỉ được khóa contract, test plan và ownership.
- `IMPLEMENTATION_APPROVED`: đủ dữ liệu để code/test, nhưng vẫn phải fail-closed khi thiếu secret production.
- `IN_PROGRESS`: có đúng một Task ID và branch đang thực hiện.
- `DONE`: scope task đã qua local/hosted gate; điều kiện production còn lại được ghi riêng.

## 3. Baseline evidence ngày 2026-09-01

| Gate | Trạng thái | Evidence |
|---|---|---|
| Source baseline | Đạt | `origin/main` tại `13da64a`, đã merge tới PR #88 |
| Hosted CI hậu-merge | Đạt | GitHub Actions run `32818075910` |
| Local runtime | Đạt | Node 24 LTS; pnpm 11.9.0; runtime gate chấp nhận `>=24.14.0 <25` |
| Lint/typecheck | Đạt | 12/12 workspace, cache bypass |
| Unit/component tests | Đạt | API 433; web 52; worker 72; admin 11; script/infra tests đạt |
| Production build | Đạt | 12/12 workspace |
| Prisma | Đạt | Schema hợp lệ; 28 migration directory hợp lệ |
| Compose syntax | Chờ chạy lại sau MNT-015 | Không cần production secret |
| Docker image build/smoke | Chưa có evidence | Docker CLI có, Docker Desktop engine chưa chạy trong phiên audit |
| Production data | Chưa đạt | Code/seed vẫn là lane synthetic hoặc dữ liệu BBQ cũ 2026-08-19 |
| Production providers | Chưa đạt | Auth, SePay, email và media đang hard-disable khi `APP_ENV=production` |

## 4. Kết luận code review

### 4.1 Đã triển khai và merge

Foundation, IAM/RBAC/audit/security middleware, CMS, room/booking/payment sandbox, BBQ, notification, operations, reports và admin APIs đã có implementation qua PR #1–#88. Các dòng tương ứng trong progress tracker được chuyển `Done` theo merge + hosted CI evidence.

### 4.2 P0 — chặn mọi go-live có giao dịch thật

| Finding | Hiện trạng code | Yêu cầu đã duyệt | Task xử lý đề xuất |
|---|---|---|---|
| Phòng và giá production chưa tồn tại | Production seed không tạo room type/phòng/rate thật; public API/UI còn gắn `SYNTHETIC`/sandbox | Phòng 201–207 active, 301 inactive; bảng giá hiệu lực 2026-09-01; đệm 200.000; giá chưa VAT | `RMS-008` |
| Booking phòng chưa phải luồng thật | Booking code/source/event/API/UI và payment eligibility vẫn giới hạn synthetic | Booking thật, hold 30 phút, 1 lần đổi tự động | `BKG-010` |
| Public booking dùng TTL không thống nhất | `PublicBookingsService` hard-code 15 phút; hai service khác mặc định 120 phút | Hold phòng 30 phút | `BKG-010` |
| Duyệt đổi ngày không thực thi nghiệp vụ | `CancellationPolicyService` có rule 60 ngày/1 lần nhưng `BookingLookupService.decide()` chỉ xử lý hủy; nhánh `DATE_CHANGE` không đổi booking/occupancy/giá và không lưu lượt đổi | Một lần đổi; lần hai liên hệ; occupancy và history cùng transaction | `BKG-010` |
| Dữ liệu và policy BBQ lệch | Seed 5 khu/29 bàn/2 slot, cọc 150.000, hold 120 phút, yêu cầu một bàn và giờ kết thúc | 3 khu × 10 bàn; 120 khách/ngày; không cọc; hold 30 phút; nhóm 5–20 chờ xác nhận | `BBQ-007` |
| Menu BBQ production chưa seed | Có schema/API nhưng seed không nhập menu mới | Dùng bốn ảnh menu ngày 2026-09-01; giá đã gồm VAT | `BBQ-007` |
| Payment production bị khóa tuyệt đối | SePay webhook config từ chối mọi `APP_ENV=production`; UI hiển thị QR sandbox | SePay và ngân hàng production đã có, credential cấp qua kênh an toàn | `PAY-007` |
| Auth production bị khóa tuyệt đối | Auth config từ chối mọi `APP_ENV=production` | Supabase production riêng đã có; MFA role bắt buộc | `REL-001`/IAM production cutover |
| Email/media production bị khóa | Email và S3 storage config từ chối production | Cần Resend/DNS và storage S3-compatible đã duyệt | `REL-001`/CMS production cutover |
| Admin Web chưa có chức năng vận hành | `apps/admin` chỉ có login, auth guard và một trang shell; chưa có UI booking/BBQ/payment/CMS/staff/report/settings | Lễ tân/Quản lý phải xử lý nghiệp vụ Phase 1 không cần gọi API thủ công | `ADM-003` |
| Notification có nguy cơ gửi trùng | Dispatcher đọc job `pending` rồi gửi trước khi claim nguyên tử; không có provider idempotency key. Nhiều worker hoặc crash sau khi provider nhận request có thể gửi lại | Dedup/at-least-once không được tạo thông báo trùng | `NTF-007` |

### 4.3 P1 — gate bắt buộc trước deploy

| Task | Quyền hiện tại | Gate còn thiếu |
|---|---|---|
| `MNT-015` Rebaseline | IN_PROGRESS | Commit/PR + hosted CI |
| `QLT-001` Critical E2E/UAT | IMPLEMENTATION_APPROVED sau data cutover | Room booking, BBQ, webhook, admin/reconciliation trên staging gần production |
| `SEC-001/SEC-002` Security review/test | IMPLEMENTATION_APPROVED sau provider cutover | ASVS trọng tâm, SAST/DAST/manual, auth/upload/webhook/IDOR/rate limit |
| `ADM-003` Production admin console | IMPLEMENTATION_APPROVED sau RMS/BKG/BBQ cutover | UI loading/empty/error/mobile, permission-aware nhưng server vẫn enforce |
| `NTF-007` Notification delivery hardening | IMPLEMENTATION_APPROVED | Atomic job claim/lease, provider idempotency, crash/retry/multi-worker integration test |
| `OPS-005` Observability | PLANNING_ONLY | Chốt platform; health, logs, metrics, alert owner |
| `OPS-006` Backup/Restore/DR | BLOCKED một phần | Production DB/storage plan; restore drill; RPO/RTO |
| `REL-001` Deployment | IN_PROGRESS | Docker build/smoke; migration job; staging; rollback evidence; production env contract |
| `REL-002` Go-live checklist | BLOCKED | Tất cả P0/P1 ở trên đạt |

## 5. Đường găng nhanh nhất

1. Hoàn tất `MNT-015`: baseline, evidence và backlog chính xác.
2. `RMS-008`: import/upsert dữ liệu phòng/giá đã duyệt, không dùng fixture synthetic.
3. `BKG-010`: chuyển public room browse/quote/booking từ sandbox sang production-safe.
4. `BBQ-007`: thay seed/policy/menu, quota ngày và luồng xác nhận nhóm.
5. `ADM-003`: dựng giao diện vận hành tối thiểu trên các API đã có.
6. `PAY-007`: bật adapter SePay production bằng explicit allow-list/config, không ghi secret vào Git.
7. `NTF-007`: harden claim/idempotency trước khi bật email production.
8. Hoàn tất `REL-001`: auth/email/storage production, container, staging, migration và rollback.
9. Chạy `QLT-001`, security gate trọng tâm, backup/restore, UAT; xử lý mọi Critical/High.
10. `REL-002` rồi mới `LIVE-001`; production deployment cần chủ dự án phê duyệt riêng.

Zalo có thể để `ZALO_ENABLED=false` ở lần go-live đầu nếu chưa có OA/template thật; kênh này không được giả lập trong production. Media upload có thể tạm ẩn nếu storage chưa duyệt, nhưng không được trỏ Google Drive cá nhân vào code S3 hiện tại bằng adapter giả.

## 6. Ownership và migration

- Mỗi thời điểm chỉ có một Task ID/branch theo `AGENTS.md`.
- Task có migration/database verification phải dùng database riêng, deploy từ trắng và deploy lần hai.
- Không sửa migration đã merge. Mọi thay đổi data/schema dùng migration forward-only hoặc seed/upsert có version/provenance và audit.
- Fixture `SYNTHETIC` tiếp tục fail-closed trong production và không được đổi tên thành dữ liệu thật.

## 7. Merge và release gates

- `git diff --check`, lint, typecheck, test, build, Prisma và Compose đạt.
- OpenAPI, permission, audit và UI loading/empty/error/mobile được kiểm tra theo phạm vi.
- Hosted Quality + Security checks đạt trên PR.
- Staging smoke dùng provider test riêng; automated test không dùng tài khoản hoặc giao dịch production.
- Không go-live khi production vẫn có nhãn/endpoint/event `sandbox`, mock provider, dữ liệu synthetic, secret thiếu, Critical/High chưa xử lý, hoặc chưa có restore/rollback evidence.

## 8. Dữ liệu/chấp thuận cần từ chủ dự án ở thời điểm cấu hình

- Domain/DNS và URL web/admin/API chính thức.
- Supabase production URL/ref/region và secret qua secret manager.
- SePay webhook credential/identifier và thông tin ngân hàng qua kênh an toàn.
- Resend key, from/reply-to và bằng chứng SPF/DKIM; Zalo chỉ khi bật.
- Chọn object storage S3-compatible và policy public/private, CORS, retention, backup.
- Phê duyệt UAT/go-live sau khi staging evidence đạt.

Không ghi bất kỳ giá trị secret hoặc số tài khoản đầy đủ nào vào repository, log, issue hoặc PR.
