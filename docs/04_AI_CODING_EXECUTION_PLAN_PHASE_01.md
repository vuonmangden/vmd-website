# AI Coding Execution Plan — Vườn Măng Đen Phase 1

## 1. Mục đích

Biến Phase 1 thành chuỗi task nhỏ, có thứ tự phụ thuộc, tiêu chí nghiệm thu, security gate và Definition of Done để AI coding có thể triển khai nhất quán từ repository trắng đến production.

Không giao yêu cầu “xây toàn bộ website theo Tech Spec”. Mỗi phiên chỉ giao một Task ID với file task hoàn chỉnh từ `06_AI_TASK_TEMPLATE.md`.

## 2. Cấu trúc tài liệu điều khiển

```text
/
├── AGENTS.md
├── README.md
├── docs/
│   ├── 00_PROJECT_CONTEXT.md
│   ├── 01_PRD_PHASE_01.md
│   ├── 02_MASTER_TECHNICAL_ARCHITECTURE.md
│   ├── 03_TECHSPEC_PHASE_01.md
│   ├── 04_AI_CODING_EXECUTION_PLAN_PHASE_01.md
│   ├── 05_SECURITY_BASELINE_PHASE_01.md
│   ├── 06_AI_TASK_TEMPLATE.md
│   ├── 07_TEST_PLAN.md
│   ├── 08_PROGRESS_TRACKER.md
│   ├── decisions/ADR-xxx.md
│   └── tasks/<TASK-ID>.md
├── apps/web
├── apps/admin
├── apps/api
├── apps/worker
├── packages/
├── prisma/
└── infrastructure/
```

## 3. Quy trình thực hiện một task

1. Product Owner chốt đầu vào và acceptance criteria.
2. Tạo file `docs/tasks/<TASK-ID>.md`; mọi trường quan trọng phải được điền.
3. AI đọc `AGENTS.md`, tài liệu nền và đúng một task.
4. AI khảo sát code, nêu phạm vi file dự kiến và rủi ro; không tự mở rộng task.
5. Tạo branch riêng, triển khai lát cắt nhỏ nhất hoàn chỉnh.
6. Chạy lint, type check, test, build và migration validation liên quan.
7. Tự review theo acceptance criteria và Security Baseline.
8. Trả báo cáo cuối task theo mẫu; tạo PR để con người review.
9. Chỉ merge khi CI xanh, review đạt và không còn blocker.
10. Cập nhật tracker và chuyển sang task kế tiếp đúng dependency.

## 4. Milestone 0 — Chốt đầu vào

| Task | Nội dung |
|---|---|
| PRE-001 | Chốt danh sách loại phòng |
| PRE-002 | Chốt danh sách phòng thực tế |
| PRE-003 | Chốt bảng giá, phụ thu và cọc |
| PRE-004 | Chốt khu vực, bàn, khung giờ và combo BBQ |
| PRE-005 | Chốt chính sách hủy, đổi lịch, hoàn tiền |
| PRE-006 | Chốt vai trò và quyền nhân sự |
| PRE-007 | Chuẩn bị domain, SePay, email, Zalo và Supabase |
| PRE-008 | Chốt bộ nhận diện, ảnh và nội dung ban đầu |

**Gate:** Không code Price Engine, Booking hoặc Payment bằng số liệu giả rồi kỳ vọng sửa sau.

## 5. Milestone 1 — Foundation

### FND-001 — Khởi tạo monorepo

- Tạo `apps/web`, `apps/admin`, `apps/api`, `apps/worker` và packages dùng chung.
- Cấu hình pnpm, Turborepo, TypeScript, `.env.example`, `AGENTS.md`, README.
- **Nghiệm thu:** cài dependency và build được toàn bộ repository.

### FND-002 — Local development

- Docker Compose cho PostgreSQL, Redis, Mailpit.
- Mock SePay, mock Zalo và seed script.
- **Nghiệm thu:** một lệnh có thể khởi chạy môi trường local.

### FND-003 — CI

- Lint, type check, unit test, build, Prisma validation, migration check, secret scan, dependency scan.

### FND-004 — API foundation

- Error format, correlation ID, structured logger, validation pipe, global exception filter, Swagger/OpenAPI và health endpoints.

### FND-005 — Database foundation

- Prisma schema, migration ban đầu, extensions.
- `idempotency_keys`, `outbox_events`, `audit_logs`, `app_settings`.

**Gate Milestone 1:** CI xanh; local chạy được; migration và seed chạy lại được từ database trắng.

## 6. Milestone 2 — Identity, RBAC và bảo mật nền

### IAM-001 — Staff authentication

- Supabase Auth, login, logout, refresh session, staff profile, trạng thái khóa tài khoản.

### IAM-002 — Roles và permissions

- Roles, permissions, role assignment, permission guard và seed permission.

### IAM-003 — Admin route protection

- Middleware, backend authorization, unauthorized/forbidden states và session expiry.

### IAM-004 — Audit service

- Audit interceptor/service; actor, before/after, IP, correlation ID; trang xem audit theo quyền.

### IAM-005 — Security middleware

- Secure headers, CORS allowlist, rate limiting, CSRF strategy, request size limit và login lockout.

**Gate:** Không bắt đầu Payment hoặc Admin nghiệp vụ khi authorization chưa hoạt động. OWASP ASVS Level 2 là baseline kiểm thử.

## 7. Milestone 3 — CMS và website công khai

### CMS-001 — Site settings

- Logo, hotline, email, địa chỉ, social links, bản đồ và footer.

### CMS-002 — Content pages

- Trang chủ, giới thiệu, chính sách, điều khoản, block schema, draft/publish.

### CMS-003 — Media

- Signed upload, MIME validation, resize, thumbnail, WebP/AVIF, alt text, public/private bucket.

### CMS-004 — Blog

- Category, article, slug, SEO metadata, publish/unpublish, related articles.

### CMS-005 — Public layouts

- Header, footer, mobile menu, sticky CTA, error pages và loading states.

### CMS-006 — Contact

- Form liên hệ, validation, CAPTCHA khi cần, admin inbox và trạng thái xử lý.

### CMS-007 — SEO

- Sitemap, robots, canonical, Open Graph, JSON-LD, redirect; `noindex` admin và checkout.

**Gate:** Website nội dung có thể deploy staging độc lập.

## 8. Milestone 4 — Phòng, giá và tồn phòng

### RMS-001 — Room Types

- CRUD loại phòng, sức chứa, tiện nghi, chính sách, ảnh và trạng thái.

### RMS-002 — Physical Rooms

- CRUD phòng thật, mã phòng, khu vực, trạng thái và bảo trì.

### RMS-003 — Rate Rules

- Giá cơ bản, ngày thường, cuối tuần, theo giai đoạn, ngày lễ và priority.

### RMS-004 — Room Blocks

- Khóa phòng, lý do, ngày bắt đầu/kết thúc và hủy block.

### RMS-005 — Price Engine

- Giá từng đêm, phụ thu, add-on, cọc, voucher cơ bản và price snapshot.

### RMS-006 — Availability Search

- Lọc theo ngày/sức chứa, room block, occupancy, trả số phòng còn; không trả room ID.

### RMS-007 — Public room pages

- Danh sách, chi tiết, bộ lọc, calendar và quote.

**Gate:** Unit test Price Engine và integration test Availability đạt.

## 9. Milestone 5 — Booking phòng

### BKG-001 — Customer Core

- Tạo customer, chuẩn hóa phone/email, tìm khả năng trùng và lưu consent.

### BKG-002 — Occupancy Model

- `room_occupancies`, unique `(room_id, stay_date)`, transaction allocation và release occupancy.

### BKG-003 — Resource Hold

- Hold 15 phút, expiry job, confirm, release và retry an toàn.

### BKG-004 — Booking Creation

- Validate quote/hold, `Idempotency-Key`, booking code, snapshot giá/chính sách, customer và transaction.

### BKG-005 — Booking State Machine

- Trạng thái và transition hợp lệ; status history; cấm sửa status trực tiếp ở controller.

### BKG-006 — Booking Checkout UI

- Chọn phòng, thông tin khách, add-on, xem lại giá/chính sách, tạo booking; loading/error/expired hold.

### BKG-007 — Booking Lookup

- Tra cứu bằng mã và liên kết an toàn; mask dữ liệu; rate limit; không lộ booking khác.

### BKG-008 — Admin Booking

- Danh sách, lọc, chi tiết, tạo thủ công theo quyền, ghi chú và lịch sử trạng thái.

### BKG-009 — Change/Cancel

- Kiểm tra chính sách; release/reallocate occupancy trong transaction; audit và lập lại reminder.

**Gate:** E2E booking đạt; test đồng thời chứng minh không double-booking; replay idempotency không tạo bản ghi mới.

## 10. Milestone 6 — Thanh toán và đối soát

### PAY-001 — Payment Intent

- Số tiền cọc, nội dung chuyển khoản duy nhất, QR/instruction, expiry và trạng thái.

### PAY-002 — SePay Webhook Ingestion

- Xác thực webhook, lưu raw event trước xử lý, mask dữ liệu nhạy cảm và trả response đúng hạn.

### PAY-003 — Idempotent Payment Processing

- Unique provider transaction, deduplication, match booking/amount/reference, cập nhật trong transaction.

### PAY-004 — Reconciliation

- Case thiếu tiền, thừa tiền, sai nội dung, thanh toán muộn/không xác định; queue xử lý thủ công.

### PAY-005 — Admin Payment

- Danh sách giao dịch/case, phân quyền, ghi nhận quyết định có lý do và audit; không auto-refund.

### PAY-006 — Payment Status UI

- Polling hoặc realtime an toàn; pending/paid/mismatch/expired; client không tự xác nhận payment.

**Gate:** Test webhook giả, replay, duplicate, event sai thứ tự và mismatch đạt; số tiền không dùng float.

## 11. Milestone 7 — BBQ

### BBQ-001 — Areas, Tables và Slots

- CRUD khu vực/bàn/khung giờ, sức chứa, trạng thái, block/bảo trì.

### BBQ-002 — Menu và Combo

- Danh mục, món/combo, giá, ảnh, availability, snapshot khi đặt.

### BBQ-003 — BBQ Availability

- Tìm chỗ theo ngày, slot, số khách và bàn còn; bảo vệ concurrent allocation.

### BBQ-004 — BBQ Booking

- Hold, tạo booking idempotent, customer, số khách, combo/add-on, cọc và status history.

### BBQ-005 — Public BBQ Flow

- Trang giới thiệu/menu, tìm chỗ, checkout, payment instruction và lookup.

### BBQ-006 — Admin BBQ

- Calendar/list/detail, tạo/sửa/hủy theo quyền, check-in/no-show và audit.

**Gate:** Không overbook bàn; giá/menu snapshot chính xác; luồng payment dùng chung control đã nghiệm thu.

## 12. Milestone 8 — Notification và tác vụ nền

### NTF-001 — Queue và Outbox

- BullMQ/Redis, transactional outbox publisher, retry/backoff, deduplication và dead-letter handling.

### NTF-002 — Email Adapter

- Provider adapter, template, local Mailpit, status gửi và masking log.

### NTF-003 — Zalo Adapter

- Provider adapter, template được duyệt, retry/rate limit và failure handling.

### NTF-004 — Booking Notifications

- Xác nhận booking/payment/change/cancel; lỗi gửi không rollback booking.

### NTF-005 — Reminders

- T-7, T-3, T-1 theo lịch; worker kiểm tra trạng thái mới nhất; đổi lịch/hủy xử lý job cũ.

### NTF-006 — Admin Failure Inbox

- Xem job lỗi, retry có kiểm soát, audit và cảnh báo backlog.

**Gate:** Test retry/deduplication đạt; không gửi reminder cho booking hủy hoặc lịch cũ.

## 13. Milestone 9 — Vận hành, báo cáo và quản trị

### OPS-001 — Operations Dashboard

- Booking đến/đi, occupancy, BBQ hôm nay, payment pending/mismatch và cảnh báo hành động.

### OPS-002 — Calendar

- Calendar phòng/BBQ theo ngày; lọc; quyền xem; timezone vận hành chính xác.

### OPS-003 — Check-in/Check-out

- Trạng thái, người thực hiện, thời gian, ghi chú và audit; không thu thập giấy tờ ngoài nhu cầu đã duyệt.

### OPS-004 — Customer View

- Hồ sơ, booking liên quan, consent và ghi chú; mask/permission cho PII.

### RPT-001 — Reports

- Doanh thu/booking/occupancy/BBQ/payment theo phạm vi Phase 1; định nghĩa metric cố định.

### RPT-002 — Export

- CSV/XLSX theo quyền, giới hạn khoảng thời gian, audit export và chống formula injection.

### ADM-001 — Staff Management

- Mời/khóa staff, gán role, MFA status; không cho tự nâng quyền.

### ADM-002 — Settings

- Setting có schema/validation, phân quyền, version/audit; secret không đọc ngược ra UI.

**Gate:** Ma trận quyền toàn admin đạt; số liệu report đối chiếu được bằng dữ liệu mẫu chuẩn.

## 14. Milestone 10 — Hardening, hiệu năng và production readiness

### QLT-001 — Test suite hoàn chỉnh

- Unit/integration/E2E cho critical path; fixture ổn định; test negative, retry, race và permission.

### SEC-001 — ASVS Level 2 Review

- Review auth/session, access control, validation, data protection, API, upload, payment và logging.

### SEC-002 — Security Testing

- SAST, dependency/secret scan, DAST staging, manual IDOR/XSS/CSRF/CORS/webhook/replay tests.

### PERF-001 — Load Test

- Kịch bản public browse, availability, quote, booking, webhook và admin; dữ liệu gần production.
- Xác nhận mục tiêu 2.000–5.000 lượt/ngày, p95/error rate, DB pool, Redis và queue backlog.

### PERF-002 — Cache và Capacity

- Cache matrix chỉ cho dữ liệu phù hợp; invalidation rõ; không cache sai booking/payment.
- Connection pool, index, slow query, worker concurrency, timeout và backpressure.

### OPS-005 — Observability

- Logs, metrics, traces/correlation, dashboards và alerts cho API, DB, queue, provider, payment.

### OPS-006 — Backup, Restore và DR

- Backup production, diễn tập restore, RPO/RTO, runbook và owner.

### REL-001 — Deployment

- Staging tương đồng production, migration step, health/readiness, rollback app và smoke test.

### REL-002 — Go-live Checklist

- Domain/DNS/TLS, env/secrets, CORS/CSP, Supabase/RLS/MFA, provider production, monitoring, backup, legal content và support rota.

**Gate:** Không go-live khi còn lỗi critical/high chưa có phê duyệt chấp nhận; restore, rollback và payment reconciliation chưa diễn tập.

## 15. Milestone 11 — Go-live và ổn định sau phát hành

### LIVE-001 — Production deployment

- Freeze thay đổi ngoài phạm vi; backup; migrate; deploy; smoke test; xác nhận provider và analytics.

### LIVE-002 — Hypercare

- Theo dõi chặt 72 giờ đầu: lỗi, latency, booking/payment mismatch, queue, email/Zalo và capacity.

### LIVE-003 — Handover

- Runbook, tài khoản/quyền, quy trình hỗ trợ, recovery, đối soát, đào tạo admin và danh sách owner.

### LIVE-004 — Phase 1 closure

- Đối chiếu acceptance criteria toàn Phase 1; chốt known issues, technical debt và backlog Phase 2.

**Gate hoàn thành Phase 1:** Critical journeys chạy production; vận hành có thể tự xử lý booking, payment, BBQ và nội dung; monitoring/backup/support hoạt động; tài liệu và bàn giao đầy đủ.

## 16. Thứ tự phụ thuộc rút gọn

```text
PRE → FND → IAM
           ├─ CMS
           ├─ RMS → BKG → PAY
           │             └─ NTF
           └─ BBQ ─────────┘
CMS + BKG + PAY + BBQ + NTF → OPS/RPT/ADM → QLT/SEC/PERF/REL → LIVE
```

Không triển khai song song các task cùng sửa một invariant quan trọng như price, occupancy, booking state hoặc payment state.

## 17. Cách vibe-code hiệu quả

### Chuẩn bị trước mỗi phiên

- Task đủ nhỏ để hoàn thành và review trong một PR; lý tưởng là một lát cắt có test.
- Ghi rõ input, output, ngoài phạm vi, dependency, file/module được phép sửa và acceptance criteria.
- Cung cấp dữ liệu thật đã chốt; nếu chưa chốt, task phải dừng ở thiết kế/schema hoặc mock adapter tách biệt.
- Bắt đầu phiên mới khi đổi Task ID để tránh context lẫn lộn.

### Prompt giao việc chuẩn

```text
Thực hiện duy nhất task <TASK-ID> theo docs/tasks/<TASK-ID>.md.
Trước khi code, đọc AGENTS.md và toàn bộ tài liệu bắt buộc trong task.
Hãy kiểm tra code hiện tại, tóm tắt phạm vi và nêu blocker nếu yêu cầu mâu thuẫn.
Không tự mở rộng phạm vi, đổi kiến trúc, thêm dependency hay đoán nghiệp vụ.
Triển khai code + migration + test + OpenAPI/audit/permission theo task.
Chạy toàn bộ kiểm tra bắt buộc và trả báo cáo cuối task đúng mẫu.
```

### Kỷ luật review

- Không chấp nhận “đã xong” chỉ dựa trên mô tả của AI; xem diff và kết quả test thực tế.
- Yêu cầu AI nêu file đã thay đổi và lý do từng thay đổi.
- Review migration, authorization, transaction, idempotency, PII/logging trước phần giao diện.
- Test thủ công bằng acceptance criteria; lưu ảnh/video với task UI.
- Commit điểm ổn định trước task mới; không để AI sửa chồng nhiều chức năng.

### Quản lý context và quyết định

- Quyết định kiến trúc mới phải ghi ADR, không chỉ nằm trong chat.
- Sau mỗi task cập nhật tracker: trạng thái, PR/commit, test, migration, blocker và next task.
- Không dùng lịch sử chat làm nguồn chuẩn; tài liệu trong repository mới là nguồn chuẩn.
- Khi context dài hoặc AI bắt đầu lặp/suy đoán, kết thúc phiên và mở phiên mới với task file.

### Chia nhỏ task

Một task tốt thường thay đổi một capability và có thể chứng minh độc lập. Nếu task gồm cả schema, nhiều màn hình, provider thật, migration dữ liệu và báo cáo, phải tách thành các task phụ có dependency. Không tách quá nhỏ đến mức mỗi task không tạo được kết quả kiểm thử có ý nghĩa.

## 18. Progress tracker tối thiểu

| Task ID | Trạng thái | Dependency | Branch/PR | Migration | Tests | Security review | Blocker | Owner |
|---|---|---|---|---|---|---|---|---|
| FND-001 | Ready | PRE-* |  | N/A |  |  |  |  |

Trạng thái hợp lệ: `Backlog`, `Ready`, `In progress`, `Blocked`, `Review`, `Done`. Chỉ một số task không xung đột được ở `In progress` cùng lúc.

## 19. Checklist trước khi giao task cho AI

- [ ] Task ID và dependency rõ ràng.
- [ ] Dữ liệu/quy tắc nghiệp vụ đã chốt hoặc đã ghi blocker.
- [ ] Acceptance criteria quan sát và kiểm thử được.
- [ ] Ngoài phạm vi rõ ràng.
- [ ] Phạm vi file/module và contract API/data rõ.
- [ ] Yêu cầu permission, audit, privacy, idempotency/concurrency được ghi.
- [ ] Test bắt buộc và lệnh chạy được ghi.
- [ ] Definition of Done đầy đủ.

## 20. Checklist nghiệm thu mỗi task

- [ ] Không vi phạm `AGENTS.md` hoặc tự mở rộng phạm vi.
- [ ] Không có mock/TODO/secret trong production path.
- [ ] Lint, type check, test, build và migration validation đạt.
- [ ] Happy path, negative path và boundary/race path liên quan đều được test.
- [ ] Server-side authorization, validation, audit và log masking đúng.
- [ ] OpenAPI/tài liệu/tracker được cập nhật.
- [ ] Có hướng dẫn kiểm thử thủ công và rủi ro còn lại.
