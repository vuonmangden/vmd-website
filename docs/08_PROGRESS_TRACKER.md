# Progress Tracker — Vườn Măng Đen Phase 1

## 1. Quy tắc sử dụng

- Đây là bảng điều phối chính của Phase 1; cập nhật sau mỗi task/PR.
- Chỉ dùng các trạng thái: `Backlog`, `Ready`, `In progress`, `Blocked`, `Review`, `Done`.
- Chỉ đánh dấu `Done` khi đạt Definition of Done trong `AGENTS.md` và task.
- Không đưa task sang `Ready` nếu dependency hoặc dữ liệu nghiệp vụ bắt buộc chưa chốt.
- Mỗi task phải liên kết branch/PR, migration, test evidence và blocker nếu có.
- Khi thay đổi kiến trúc hoặc quyết định nghiệp vụ quan trọng, tạo ADR trong `docs/decisions/`.

## 2. Tổng quan tiến độ

| Chỉ số | Giá trị hiện tại |
|---|---|
| Phase | Phase 1 — MVP |
| Trạng thái tổng thể | Baseline local và GitHub-hosted đã xác minh; `main` có required CI checks và branch protection |
| Milestone hiện tại | Milestone 0 vẫn chặn dữ liệu thật; Milestone 2/4/5/6 đã xong ở lane synthetic |
| Task đang thực hiện | CMS-001, CMS-006, BKG-008, ADM-001, OPS-003, OPS-004, NTF-006 (Claude, 2026-08-16) |
| Task hoàn thành | 46 — FND-001–005, IAM-001–005, CMS-005, RMS-001–007, BKG-001–007, PAY-001–003 và PAY-006, NTF-001–002, TST-001–002, MNT-002–014 |
| Blocker mở | BLK-001 — PRE-001, PRE-002, PRE-003, PRE-004, PRE-005 và phần còn lại của PRE-007 chưa được duyệt |
| Cập nhật gần nhất | 2026-08-16 |

## 3. Milestone 0 — Chốt đầu vào

| Task ID | Nội dung | Trạng thái | Owner | Bằng chứng/Link | Blocker/Ghi chú |
|---|---|---|---|---|---|
| PRE-001 | Chốt danh sách loại phòng | Blocked | Chủ dự án | `docs/09_MILESTONE_0_INPUT_PACK.md` §4 | Chờ chủ dự án điền và duyệt; không được giả định |
| PRE-002 | Chốt danh sách phòng thực tế | Blocked | Chủ dự án | `docs/09_MILESTONE_0_INPUT_PACK.md` §5 | Chờ mã phòng, sức chứa, trạng thái được duyệt |
| PRE-003 | Chốt bảng giá, phụ thu và cọc | Blocked | Chủ dự án | `docs/09_MILESTONE_0_INPUT_PACK.md` §6 | P0 blocker cho Price Engine/Booking |
| PRE-004 | Chốt khu vực, bàn, khung giờ và combo BBQ | Blocked | Chủ dự án | `docs/09_MILESTONE_0_INPUT_PACK.md` §7 | Chờ dữ liệu vận hành BBQ được duyệt |
| PRE-005 | Chốt chính sách hủy, đổi lịch, hoàn tiền | Blocked | Chủ dự án | `docs/09_MILESTONE_0_INPUT_PACK.md` §8 | P0 blocker cho Booking/Payment |
| PRE-006 | Chốt vai trò và quyền nhân sự | Ready | Chủ dự án | `docs/09_MILESTONE_0_INPUT_PACK.md` §9 | Duyệt toàn bộ decision packet ngày 2026-08-11; mở IAM-002 |
| PRE-007 | Chuẩn bị domain, Supabase, SePay, email, Zalo | Blocked | Chủ dự án | `docs/09_MILESTONE_0_INPUT_PACK.md` §10 | IAM-001/NTF-002 được mở staging-only ngày 2026-08-11; production vẫn chờ Supabase project riêng (`REL-001`) và SPF/DKIM. SePay/Zalo/object storage vẫn blocked; không ghi secret vào Git |
| PRE-008 | Chốt bộ nhận diện, ảnh và nội dung ban đầu | Ready | Chủ dự án | `docs/09_MILESTONE_0_INPUT_PACK.md` §11 | Đủ phạm vi CMS-005: quyền logo/brand board, photo-free homepage và system-font fallback được duyệt 2026-08-10; legal/CTA và ảnh venue vẫn ngoài phạm vi |

**Gate:** Không triển khai Price Engine, Booking hoặc Payment bằng dữ liệu giả rồi kỳ vọng sửa sau.

## 4. Milestone 1 — Foundation

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Migration | Tests | Security | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| FND-001 | Khởi tạo monorepo | Done | Không | `chore/fnd-001-initialize-monorepo` / `3c5036a`, `8913286` | N/A | Node 24.14.0; pnpm 11.9.0; frozen install đạt; lint/typecheck/test/build 12/12 đạt với Turbo cache bypass; web/admin HTTP 200, API port 3002, worker duy trì tiến trình | Node 22.14.0 bị runtime gate từ chối; local secret/client-env/ignore checks đạt | Human review đã duyệt; còn 3 deprecated transitive dependencies (`glob@10.5.0`, `glob@7.2.3`, `inflight@1.0.6`) |
| FND-002 | Local development | Done | FND-001 | `chore/fnd-002-local-development` / `01ce62e`, `eb74fe9`, `10ef3cb` | Không | Node 24.14.0; pnpm 11.9.0 frozen install đạt; lint/typecheck/test/build 12/12 đạt, cache bypass; 7/7 unit test FND-002 đạt; Compose config và 6/6 service healthy | Loopback-only ports; pinned images; không latest/privileged/socket/secret; `.env` fallback, env boundary và ignore checks đạt | Human review đã duyệt; read-only MinIO check; marker giữ nguyên timestamp/ETag sau restart; down giữ 4 named volumes; evidence: `docs/evidence/FND-002-LOCAL-ENVIRONMENT.md` |
| FND-003 | CI | Done | FND-001 | `chore/fnd-003-ci`; hardened trong PR #1 | N/A | Local full gate đạt; GitHub Actions run `31309744163` đạt cả Quality và Security trên PR thật | Gitleaks source/history và production dependency audit đạt; actions pin SHA, quyền read-only; `main` bắt buộc 2 checks, strict/up-to-date, admin enforcement, linear history, conversation resolution; force-push/delete bị chặn | GitHub-hosted CI và branch protection xác minh ngày 2026-08-09 |
| FND-004 | API foundation | Done | FND-001, FND-002 | `chore/fnd-004-api-foundation` | N/A | lint/typecheck/test/build 12/12 đạt; 11 API tests (correlation-id 4, exception-filter 3, health 3, app-module 1) đạt; 4 app shells build thành công | Không stack trace trong response; không secret/PII trong log; correlation ID validate UUID | Error format §25.3, correlation ID §40, validation pipe, global exception filter, Swagger `/api/docs`, health endpoints `/health/{live,ready,dependencies}`, structured logger `@vmd/logging` |
| FND-005 | Database foundation | Done | FND-002, FND-004 | `chore/fnd-005-database-foundation`; audit MNT-001; PR #1 hosted verification | `20260807000000_initial_foundation` — 4 tables, 3 extensions, 2 indexes | Prisma 7 regression, database-blank deploy, deploy lần hai, seed hai lần, API database health và GitHub-hosted full gate đều đạt | DATABASE_URL server-only; connection string không log; audit_logs immutable; app_settings chỉ giữ giá trị kỹ thuật | Local database verification và hosted CI đều đạt ngày 2026-08-09 |

**Gate:** CI xanh; local chạy được; migration và seed chạy được từ database trắng.

## 5. Milestone 2 — Identity, RBAC và bảo mật nền

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests/Security | Ghi chú |
|---|---|---|---|---|---|---|
| IAM-001 | Staff authentication | Done | FND-004, FND-005, PRE-007 | PR #13 / merge `4f341fd` | Supabase staging login/me/refresh rotation/logout/revoke E2E; PR CI `31483277392` và main CI `31483454326` đạt | Production hard-disabled đến `REL-001`; không RBAC trong task này |
| IAM-002 | Roles và permissions | Done | IAM-001, PRE-006 | PR #17 / `codex/iam-002-rbac` | Migration blank/deploy x2, seed x2 5/15/46, API 61 tests, full local gate, Supabase staging RBAC E2E và hosted run `31486190686` đạt | Production/MFA go-live vẫn blocked đến REL-001 |
| IAM-003 | Admin route protection | Done | IAM-002 | PR #18 / `codex/iam-003-admin-route-protection` | Admin 11/11, API 63/63; full local gate và hosted run `31487239678` đạt | Backend auth+permission guard; frontend trusted `/auth/me`, refresh-once và 401/403/unavailable states |
| IAM-004 | Audit service | Done | FND-005, IAM-001, IAM-002 | `codex/iam-004-audit-service-v2` | Hosted CI 31666735501 pass (secret/dependency; quality/schema/Compose) | Immutable operational audit; viewer cần `audit.read`, không có API sửa/xóa |
| IAM-005 | Security middleware | Done | FND-004, IAM-001 | `codex/iam-005-security-middleware` | Hosted CI 31667308607 pass (secret/dependency; quality/schema/Compose) | Headers, CORS, rate limit, Bearer-only CSRF decision |

**Gate:** Authorization hoạt động trước Payment hoặc Admin nghiệp vụ.

## 6. Milestone 3 — CMS và website công khai

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests | Ghi chú |
|---|---|---|---|---|---|---|
| CMS-001 | Site settings | In progress (Claude, 2026-08-16) | FND-005, IAM-002, PRE-008 | `claude/cms-001-site-settings` |  |  |
| CMS-002 | Content pages | Backlog | CMS-001 |  |  | Draft/publish |
| CMS-003 | Media | Backlog | IAM-002, PRE-007 |  |  | Upload security |
| CMS-004 | Blog | Backlog | CMS-002, CMS-003 |  |  | SEO metadata |
| CMS-005 | Public layouts | Done | FND-001, PRE-008 | `codex/cms-005-public-layouts` | 3 web tests, visual QA desktop/mobile, full lint/typecheck/test/build đạt | Mobile-first; logo/link/contact đã duyệt; photo-free homepage; không API/migration/dependency |
| CMS-006 | Contact | In progress (Claude, 2026-08-16) | FND-004, IAM-002 | `claude/cms-006-contact` |  | Validation/rate limit |
| CMS-007 | SEO | Backlog | CMS-002, CMS-004, CMS-005 |  |  | Sitemap, robots, JSON-LD |

**Gate:** Website nội dung deploy staging độc lập.

## 7. Milestone 4 — Phòng, giá và tồn phòng

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests | Ghi chú |
|---|---|---|---|---|---|---|
| RMS-001 | Room Types | Done | FND-005, IAM-002, MNT-014 | PR #20 / `codex/rms-001-room-types-implementation` | Migration blank/deploy x2, seed x2, API 68/68, fixture 8/8, full local gate và hosted run `31593218934` đạt | Synthetic/staging-only; PRE-001 vẫn Blocked, không production |
| RMS-002 | Physical Rooms | Done | RMS-001, MNT-014 | PR #21 / `codex/rms-002-physical-rooms-synthetic` | Migration blank/deploy x2, seed x2, API 68/68, fixture 8/8, full local gate và hosted run `31594299696` đạt | Synthetic/staging-only; PRE-002 vẫn Blocked, không production |
| RMS-003 | Rate Rules | Done | RMS-001, MNT-014 | PR #22 / `codex/rms-003-rate-rules-sandbox` | Migration blank/deploy x2, seed x2, API 72/72, fixture 8/8, hosted run `31598071210` đạt | Synthetic-only; PRE-003/PRE-005 vẫn Blocked, không public price hoặc production policy |
| RMS-004 | Room Blocks | Done | RMS-002, MNT-014 | PR #23 / `codex/rms-004-room-blocks-sandbox` | Migration blank/deploy x2, seed x2, API 76/76, fixture 8/8, hosted run `31599535588` đạt | Synthetic-only; không thay `PRE-002`, không public booking |
| RMS-005 | Price Engine | Done | RMS-003, MNT-014 | PR #24 / `codex/rms-005-price-engine-sandbox` / merge `2151e10` | API 81/81, full local gate; hosted CI đạt khi merge | Synthetic-only; PRE-003/PRE-005 vẫn Blocked |
| RMS-006 | Availability Search | Done | RMS-002, RMS-004, MNT-014 | PR #25 / `codex/rms-006-availability-search-sandbox` / merge `0121c36` | Integration test đạt; hosted CI đạt khi merge | Synthetic-only; chưa bao gồm occupancy/hold/booking |
| RMS-007 | Public room pages | Done | RMS-001, RMS-005, RMS-006, CMS-005 | PR #33 / `codex/rms-007-public-room-pages` / merge `c979f40` | API/web unit tests, typecheck và build đạt; hosted CI đạt khi merge | Synthetic-only safe public API; no room IDs, inventory, holds or booking creation |

**Gate:** Price Engine unit test và Availability integration test đạt.

## 8. Milestone 5 — Booking phòng

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests | Ghi chú |
|---|---|---|---|---|---|---|
| BKG-001 | Customer Core | Done | FND-005 | `chore/fnd-005-database-foundation`; audit MNT-001; PR #1 hosted verification | API 32/32 tests đạt; customer + outbox cùng transaction, có rollback regression | Migration `20260808000000_add_customers` áp dụng thành công trên PostgreSQL verification trắng; hosted CI đạt ngày 2026-08-09 |
| BKG-002 | Occupancy Model | Done | RMS-002, MNT-014 | PR #26 / `codex/bkg-002-occupancy-sandbox` / merge `9f4500b` | Unique `(room_id, stay_date)`; hosted CI đạt khi merge | Synthetic-only; booking FK deferred to BKG-004 |
| BKG-003 | Resource Hold | Done | BKG-002, MNT-014 | PR #27 / `codex/bkg-003-resource-holds-sandbox` / merge `0584d71` | TTL/expiry/retry; hosted CI đạt khi merge | Synthetic-only; booking lifecycle deferred to BKG-004 |
| BKG-004 | Booking Creation | Done | BKG-001, BKG-003, RMS-005 | PR #28 / `codex/bkg-004-booking-creation` / merge `0fcbd8d` | Idempotency replay; hosted CI đạt khi merge | Synthetic-only; PRE-003/PRE-005 vẫn Blocked |
| BKG-005 | Booking State Machine | Done | BKG-004, MNT-014 | PR #29 / `codex/bkg-005-booking-state-sandbox` / merge `3e39a00` | Status history; hosted CI đạt khi merge | Synthetic-only; no payment/refund policy |
| BKG-006 | Booking Checkout UI | Done | BKG-004, RMS-007 | PR #35 / `codex/bkg-006-public-room-checkout` / merge `0d1b99c` | Mobile/loading/error states; hosted CI đạt khi merge | Synthetic-only public checkout sandbox |
| BKG-007 | Booking Lookup | Done | BKG-004 | PR #37 / `codex/bkg-007-booking-lookup` / merge `cb143ca` | Public lookup/request + internal approval; hosted CI đạt khi merge | Rate limit/IDOR |
| BKG-008 | Admin Booking | In progress (Claude, 2026-08-16) | BKG-005, IAM-003 | `claude/bkg-008-admin-booking` |  | Permission/audit |
| BKG-009 | Change/Cancel | Backlog | BKG-005, PRE-005 |  |  | Transaction/reminder |

**Gate:** E2E booking, concurrency và idempotency replay đạt.

## 9. Milestone 6 — Thanh toán và đối soát

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests | Ghi chú |
|---|---|---|---|---|---|---|
| PAY-001 | Payment Intent | Done | BKG-004, synthetic lane authorization | PR #32 / `codex/pay-001-payment-intent-sandbox` / merge `9f500ae` | API lint/typecheck, payment unit tests 6/6, Prisma validation; hosted CI đạt khi merge | Sandbox-only: no provider secret, bank data, webhook, or public confirmation |
| PAY-002 | SePay Webhook Ingestion | Done | PAY-001, IAM-005 | PR #34 / `codex/pay-002-sepay-webhook` / merge `9332ecf` | API lint/typecheck, webhook unit tests, Prisma validation; hosted CI đạt khi merge | Test Mode only; raw event before queue; production fail-closed |
| PAY-003 | Idempotent Payment Processing | Done | PAY-002 | PR #36 / `codex/pay-003-payment-processing` / merge `dd13c21` | API lint/typecheck, 16 payment tests; hosted CI đạt khi merge | Exact amount + reference only; unique provider transaction |
| PAY-004 | Reconciliation | Backlog | PAY-003, PRE-005 |  |  | **Blocked bởi PRE-005** — cần chính sách thiếu/thừa/sai nội dung/muộn |
| PAY-005 | Admin Payment | Backlog | PAY-004, IAM-003, IAM-004 |  |  | Chờ PAY-004 |
| PAY-006 | Payment Status UI | Done | PAY-003, BKG-006 | PR #38 / `codex/pay-006-payment-status-ui` / merge `d92617f` | Public status polling; hosted CI đạt khi merge | Client không tự xác nhận; synthetic-only |

**Gate:** Webhook auth/replay/duplicate/out-of-order/mismatch tests đạt.

## 10. Milestone 7 — BBQ

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests | Ghi chú |
|---|---|---|---|---|---|---|
| BBQ-001 | Areas, Tables và Slots | Backlog | FND-005, PRE-004 |  |  |  |
| BBQ-002 | Menu và Combo | Backlog | PRE-004, IAM-002 |  |  | Price snapshot |
| BBQ-003 | BBQ Availability | Backlog | BBQ-001 |  |  | Concurrent allocation |
| BBQ-004 | BBQ Booking | Backlog | BBQ-002, BBQ-003, BKG-001 |  |  | Hold/idempotency |
| BBQ-005 | Public BBQ Flow | Backlog | BBQ-004, CMS-005 |  |  |  |
| BBQ-006 | Admin BBQ | Backlog | BBQ-004, IAM-003 |  |  | Permission/audit |

**Gate:** Không overbook bàn; snapshot giá/menu đúng; payment controls được tái sử dụng.

## 11. Milestone 8 — Notification và tác vụ nền

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests | Ghi chú |
|---|---|---|---|---|---|---|
| NTF-001 | Queue và Outbox | Done | FND-005 | `chore/fnd-005-database-foundation`; audit MNT-001; PR #1 hosted verification | Worker 8/8 tests đạt; queue registration, fail-closed route và event-id job dedup regression đạt | Redis/PostgreSQL healthy; Worker startup smoke đạt với `Outbox processor started`; hosted CI đạt ngày 2026-08-09 |
| NTF-002 | Email Adapter | Done | NTF-001, PRE-007 | PR #12 / `codex/ntf-002-staging-email` | Worker 27/27; PR run `31463984180` và post-merge main run `31468483338` đạt | Resend staging/Mailpit local; production hard-disabled; webhook/bounce ngoài scope |
| NTF-003 | Zalo Adapter | Backlog | NTF-001, PRE-007 |  |  | Template được duyệt |
| NTF-004 | Booking Notifications | Backlog | NTF-002, NTF-003, BKG-005, PAY-003 |  |  |  |
| NTF-005 | Reminders | Backlog | NTF-004, PRE-005 |  |  | T-7/T-3/T-1 |
| NTF-006 | Admin Failure Inbox | In progress (Claude, 2026-08-16) | NTF-001, IAM-003 | `claude/ntf-006-failure-inbox` |  | Retry có audit |

**Gate:** Retry/dedup đạt; booking hủy/đổi không nhận reminder sai.

## 12. Milestone 9 — Vận hành, báo cáo và quản trị

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests | Ghi chú |
|---|---|---|---|---|---|---|
| OPS-001 | Operations Dashboard | Backlog | BKG-008, BBQ-006, PAY-005 |  |  |  |
| OPS-002 | Calendar | Backlog | BKG-008, BBQ-006 |  |  | Timezone |
| OPS-003 | Check-in/Check-out | In progress (Claude, 2026-08-16) | BKG-005, IAM-004 | `claude/ops-003-check-in-out` |  | Audit |
| OPS-004 | Customer View | In progress (Claude, 2026-08-16) | BKG-001, IAM-003 | `claude/ops-004-customer-view` |  | PII/permission |
| RPT-001 | Reports | Backlog | PAY-005, OPS-001 |  |  | Metric definitions |
| RPT-002 | Export | Backlog | RPT-001, IAM-003 |  |  | Audit/formula injection |
| ADM-001 | Staff Management | In progress (Claude, 2026-08-16) | IAM-002, IAM-003 | `claude/adm-001-staff-management` |  | Prevent privilege escalation |
| ADM-002 | Settings | Backlog | IAM-004, CMS-001 |  |  | Secret not readable |

**Gate:** Admin role matrix đạt; report đối chiếu đúng dữ liệu chuẩn.

## 13. Milestone 10 — Hardening và production readiness

| Task ID | Nội dung | Trạng thái | Dependency | Owner | Bằng chứng | Ghi chú |
|---|---|---|---|---|---|---|
| QLT-001 | Test suite hoàn chỉnh | Backlog | Các module Phase 1 | TBD |  | Critical regression |
| SEC-001 | ASVS Level 2 Review | Backlog | IAM/PAY/BKG hoàn chỉnh | TBD |  |  |
| SEC-002 | Security Testing | Backlog | SEC-001 | TBD |  | SAST/DAST/manual |
| PERF-001 | Load Test | Backlog | Critical flows ổn định | TBD |  | 2.000–5.000 lượt/ngày |
| PERF-002 | Cache và Capacity | Backlog | PERF-001 | TBD |  | Pool/index/backpressure |
| OPS-005 | Observability | Backlog | Critical modules | TBD |  | Metrics/alerts |
| OPS-006 | Backup, Restore và DR | Backlog | Production DB plan | TBD |  | Restore drill |
| REL-001 | Deployment | Backlog | QLT/SEC/PERF/OPS | TBD |  | Rollback/smoke |
| REL-002 | Go-live Checklist | Backlog | REL-001 | TBD |  |  |

## 14. Milestone 11 — Go-live và bàn giao

| Task ID | Nội dung | Trạng thái | Dependency | Owner | Bằng chứng | Ghi chú |
|---|---|---|---|---|---|---|
| LIVE-001 | Production deployment | Backlog | REL-002 | TBD |  |  |
| LIVE-002 | Hypercare 72 giờ | Backlog | LIVE-001 | TBD |  |  |
| LIVE-003 | Handover | Backlog | LIVE-002 | TBD |  | Runbook/training |
| LIVE-004 | Phase 1 closure | Backlog | LIVE-003 | TBD |  | Known issues/Phase 2 backlog |

## 14b. Prep Tasks (không thuộc task ID chính)

| # | Nội dung | Trạng thái | File tạo/thay đổi | Ghi chú |
|---|---|---|---|---|
| PREP-001 | Dockerfile staging (API + Worker) | Backlog | Không giữ | Review phát hiện healthcheck giả; loại khỏi working tree |
| PREP-002 | Prisma seed script mở rộng | Backlog | Không giữ | Loại sample PII và giá trị booking/notification chưa được duyệt |
| PREP-003 | E2E test infrastructure | Backlog | Không giữ | Playwright cũ có advisory và cấu hình không khởi động API đúng |
| PREP-004 | Git hooks (husky + lint-staged) | Backlog | Không giữ | Chưa có task/phê duyệt; tránh tự sửa staged source bằng hook |
| PREP-005 | Shared types & state machines | Backlog | Không giữ | Logic trạng thái nghiệp vụ chưa có task/test/phê duyệt |
| PREP-006 | API rate limiting foundation | Backlog | Không giữ | Giới hạn tự đặt và chưa xử lý proxy/multi-instance |

**Lưu ý:** Sáu nhóm prep trên chỉ là thay đổi chưa commit được audit trong MNT-001; chúng không phải task đã hoàn thành và đã được loại bỏ. Không triển khai lại nếu chưa có task và phê duyệt riêng.

## 14c. Maintenance và test-enablement tasks

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Evidence/Ghi chú |
|---|---|---|---|---|---|
| MNT-002 | Project acceleration và Milestone 0 input pack | Done | MNT-001 | PR #1 / `b02083a` | CI PR và hậu-merge xanh; `main` protected; PRE/BLK-001 tiếp tục độc lập |
| MNT-003 | Delivery readiness matrix và synthetic fixture handoff | Done | MNT-002, foundation gates | `codex/mnt-003-readiness-matrix`; PR #2 | Matrix, ownership và task spec TST-001; hosted CI `31310202234` xanh |
| TST-001 | Synthetic non-production fixtures | Done | MNT-003, FND-005, DEC-004 | `codex/tst-001-synthetic-fixtures`; PR #3 | 9/9 unit/integration trên `vmd_synthetic_test`; seed x2/cleanup, production rejection, full local gate và hosted run `31312405432` đạt; không migration/dependency |
| MNT-004 | Planning-only feature lane specifications | Done | MNT-003, TST-001 | `codex/mnt-004-lane-planning` | IAM-001/CMS-005/NTF-002 specs; local lint/typecheck/test/build đạt; không production code, migration hoặc dependency |
| MNT-005 | PRE-008 brand intake and gate review | Done | MNT-004 | `codex/mnt-005-pre008-handoff` | Logo Drive nguồn kiểm tra được; ghi nhận brand/contact/intro; lint/typecheck/test/build đạt; CMS-005 vẫn chờ quyền asset/font và quyết định ảnh |
| MNT-006 | PRE-008 public link intake | Done | MNT-005 | `codex/mnt-006-pre008-public-links` | Facebook, TikTok, Instagram và Maps do chủ dự án cung cấp; local lint/typecheck/test/build đạt; không có code/asset mới |
| MNT-007 | PRE-007 identity intake and gate review | Done | MNT-004 | `codex/mnt-007-pre007-auth-intake` | Ghi nhận Supabase/JWT/CORS/auth/session/MFA/secret-management metadata; full lint/typecheck/test/build đạt; không có secret, code, migration hoặc provider configuration |
| MNT-008 | PRE-007 production and email proposal intake | Done | MNT-007 | `codex/mnt-008-pre007-production-intake` | Ghi nhận cấu hình production/email ở trạng thái đề xuất; full lint/typecheck/test/build đạt; không có secret, code, migration hoặc provider configuration |
| MNT-009 | PRE-007 confirmation intake | Done | MNT-008 | `codex/mnt-009-pre007-finalization-intake` | Ghi nhận quyết định tách Supabase, CORS/callback, Resend/email DNS và Railway Variables; full lint/typecheck/test/build đạt; không có secret, code, migration hoặc provider configuration |
| MNT-010 | PRE-007 staging-only implementation gate | Done | MNT-009 | PR #11 / `codex/mnt-010-pre007-staging-gate` | IAM-001/NTF-002 được Ready staging-only; production fail-closed đến `REL-001` và SPF/DKIM; local full gate và hosted run `31462567769` đạt |
| MNT-011 | Staging lane completion handoff | Done | MNT-010, NTF-002 | PR #14 / `codex/mnt-011-lane-handoff` | NTF-002 Done; IAM-001 Review chờ Supabase staging E2E; local full gate và hosted run `31468935815` đạt |
| MNT-014 | Synthetic booking lane authorization | Done | DEC-004, TST-001 | `codex/rms-001-room-types-synthetic` | Owner duyệt lane RMS → Booking → Payment sandbox; PRE-001–005 và BLK-001 giữ Blocked | RMS-001 được mở synthetic/staging-only; thông số nhạy cảm vẫn chờ cấu hình thật |
| MNT-012 | PRE-006 decision packet and IAM wave handoff | Done | IAM-001, MNT-011 | PR #15 / `codex/mnt-012-pre006-iam-wave` | IAM-002–IAM-005 planning-only specs; full local gate và hosted run `31484012208` đạt; PRE-006 vẫn chờ owner approval |
| MNT-013 | PRE-006 owner approval | Done | MNT-012, IAM-001 | PR #16 / `codex/mnt-013-pre006-approval` | Owner duyệt matrix/MFA/owner/SLA; mở IAM-002; full local gate và hosted run `31484717378` đạt; không code/migration/seed |

## 14d. Phối hợp agent

Dự án có Claude Code và Codex làm song song. Quy trình bắt buộc — fetch `main`, đọc tracker từ `origin/main`, claim task trước khi code, đặt tiền tố nhánh theo agent — nằm ở `AGENTS.md` §17 và `docs/10_AGENT_COORDINATION.md`.

Ngày 2026-08-16 đã xảy ra một lần trùng lặp: Claude triển khai lại IAM-001–005 và NTF-002 vốn đã merge từ 2026-08-11, do đọc bản tracker cũ trên nhánh feature. Sáu PR (#41–#46) bị đóng. Quy trình ở §17 sinh ra từ sự cố này.

## 15. Blocker log

| ID | Ngày mở | Liên quan | Mô tả | Ảnh hưởng | Owner | Trạng thái | Quyết định/Ngày đóng |
|---|---|---|---|---|---|---|---|
| BLK-001 | 2026-08-05 | PRE-* | Dữ liệu vận hành Milestone 0 chưa được chủ dự án xác nhận | Chưa thể triển khai module nghiệp vụ phụ thuộc | Chủ dự án | Open | Input pack đã tạo tại `docs/09_MILESTONE_0_INPUT_PACK.md`; chờ điền và duyệt, không ghi secret vào Git |
| BLK-002 | 2026-08-09 | FND-005, BKG-001, NTF-001, MNT-001 | Máy audit ban đầu không có Docker CLI/Engine | Đã chạy database trắng, seed idempotency, service/API/Worker smoke trong project verification tách biệt | Chủ dự án | Closed | Docker Desktop khả dụng; toàn bộ local verification đạt ngày 2026-08-09 |
| BLK-003 | 2026-08-09 | FND-003 | Chưa có bằng chứng GitHub-hosted run/branch protection | CI không thể được đánh dấu Done chỉ bằng local validation | Chủ dự án | Closed | GitHub Actions run `31309744163` xanh; `main` yêu cầu Quality + Security checks và chặn force-push/delete ngày 2026-08-09 |

## 16. Open decisions

| ID | Câu hỏi cần quyết định | Task bị ảnh hưởng | Owner | Hạn | Trạng thái | ADR |
|---|---|---|---|---|---|---|
| DEC-001 | Xác nhận toolchain, test runner, package scope và secret scanning | FND-001 | Chủ dự án | 2026-08-05 | Closed | `docs/decisions/ADR-001-FOUNDATION-TOOLCHAIN.md` |
| DEC-002 | Xác nhận lệnh chuẩn và toolchain CI | FND-003 | Claude | 2026-08-08 | Closed | `docs/decisions/ADR-002-CI-TOOLCHAIN.md` |
| DEC-003 | Xác nhận dữ liệu và chính sách Milestone 0 | RMS/BKG/PAY/BBQ | TBD | Trước module tương ứng | Open |  |
| DEC-004 | Cho phép dùng dữ liệu giả lập có guard trong local/development/test/demo nội bộ cho đến khi có dữ liệu thật; không áp dụng production và không đóng PRE/BLK-001 | PRE-001–PRE-008 và task phụ thuộc | Chủ dự án | 2026-08-09 | Closed | Ghi nhận tại `docs/09_MILESTONE_0_INPUT_PACK.md` |

## 17. Defect summary

| Severity | Open | In progress | Fixed pending verify | Closed |
|---|---:|---:|---:|---:|
| P0 | 0 | 0 | 0 | 0 |
| P1 | 0 | 0 | 2 | 0 |
| P2 | 0 | 0 | 0 | 0 |
| P3 | 0 | 0 | 0 | 0 |

## 18. Mẫu cập nhật sau mỗi task

```text
Task ID:
Trạng thái mới:
Branch/PR/Commit:
File thay đổi:
Migration:
Test đã chạy và kết quả:
Security review:
Acceptance criteria:
Blocker/rủi ro còn lại:
Task tiếp theo đủ điều kiện:
Ngày cập nhật:
Người cập nhật:
```

## 19. Lịch sử cập nhật


| Ngày | Người cập nhật | Nội dung |
|---|---|---|
| 2026-08-05 | Codex | Khởi tạo tracker Phase 1 theo Execution Plan; FND-001 ở trạng thái Ready có điều kiện |
| 2026-08-05 | Codex | Hoàn tất triển khai FND-001 trên branch `chore/fnd-001-initialize-monorepo`; chuyển sang Review sau khi frozen install, lint, typecheck, test, build, smoke và kiểm tra bảo mật cục bộ đạt |
| 2026-08-06 | Codex | Xử lý code review FND-001: enforce Node 24.14.0, đồng bộ `@types/node` 24.13.3, sửa frontend tests render component thật; toàn bộ gate chạy lại với Turbo `--force` và không dùng cache |
| 2026-08-06 | Codex | Chủ dự án duyệt FND-001; chuyển task sang Done với hai commit `3c5036a` và `8913286`, bắt đầu chuẩn bị FND-002 |
| 2026-08-06 | Codex | Triển khai FND-002 local environment; toàn bộ quality gate, service health, provider mock, volume persistence và restart test đạt; chuyển task sang Review |
| 2026-08-06 | Codex | Xử lý review FND-002: env fallback đa nền tảng, read-only MinIO marker check, root lint/test coverage và bằng chứng Docker/persistence thực tế; giữ trạng thái Review |
| 2026-08-06 | Codex | Chủ dự án duyệt và đóng FND-002 sau khi xác minh code, unit test, Docker, Compose và persistence; chuyển sang Done, FND-003 vẫn Backlog và chỉ ở bước chuẩn bị |
| 2026-08-07 | Claude | Triển khai FND-004 API foundation: error format §25.3, correlation ID, validation pipe, global exception filter, Swagger, health endpoints, structured logger; 11 API tests đạt, lint/typecheck/test/build 12/12 đạt; chuyển sang Review |
| 2026-08-07 | Claude | Chủ dự án duyệt FND-004; chuyển sang Done; commit trên branch `chore/fnd-004-api-foundation` |
| 2026-08-08 | Claude | Triển khai FND-005 database foundation: Prisma 7.7.0 với @prisma/adapter-pg, migration initial_foundation (4 tables: audit_logs, idempotency_keys, outbox_events, app_settings; 3 extensions: pgcrypto, btree_gist, citext; 2 indexes), PrismaService/PrismaModule, health/dependencies DB check, seed script; 16 API tests đạt, lint/typecheck/test/build 12/12 đạt; chuyển sang Done |
| 2026-08-08 | Claude | Triển khai FND-003 CI pipeline: GitHub Actions workflow với 2 jobs song song (ci: install/lint/typecheck/test/prisma-validate/build, security: gitleaks secret scan + pnpm audit dependency scan); ADR-002 đóng DEC-002; lint/typecheck/test/build 12/12 đạt local; prisma validate đạt; chuyển sang Done |
| 2026-08-08 | Claude | Triển khai BKG-001 Customer Core: migration add_customers (17 cột, 2 indexes), Prisma Customer model, CustomersService (normalize phone E.164, normalize email, findDuplicates, findOrCreate, softDelete, generateCode VMD-*), outbox event customer.created, CreateCustomerDto/UpdateCustomerDto, CustomersModule; 31 API tests (15 customer tests mới) đạt, lint/typecheck/test/build 12/12 đạt; chuyển sang Done |
| 2026-08-08 | Claude | Triển khai NTF-001 Queue và Outbox: BullMQ 6.0.9 + @nestjs/bullmq 11.0.5 cho API và Worker; 9 queues theo §42; OutboxProcessor (poll pending → dispatch → mark published, retry max 5 → mark failed); QueueModule shared; PrismaModule cho Worker; migration notification_jobs + notification_deliveries theo §10.37-38; 31 API tests + 7 worker tests + 7 script tests đạt; chuyển sang Done |
| 2026-08-08 | Claude | Triển khai 3 prep tasks trong khi chờ PRE-007: (1) Dockerfile staging multi-stage cho API + Worker với compose.staging.yaml và .dockerignore; (2) Mở rộng prisma/seed.ts — 8 app_settings + 2 sample customers; (3) E2E test infra — Playwright 1.52.0, config chromium + mobile-chrome, health smoke tests. Lint/typecheck/test/build 12/12 đạt. Sửa lint error unused BullModule import trong app.module.spec.ts |
| 2026-08-08 | Claude | Triển khai 3 prep tasks bổ sung: (4) Git hooks — husky 9.1.7 + lint-staged 16.1.0, pre-commit chạy eslint --fix trên staged files; (5) Shared types @vmd/types — BookingStatus 13 values + state machine transitions (§12), BbqStatus 11 values + transitions (§13), PaymentStatus 11 values (§14), NotificationJobStatus, NotificationDeliveryStatus, OutboxEventStatus; (6) API rate limiting — @nestjs/throttler 6.4.0, 3 tiers (short/medium/long), global ThrottlerGuard theo Security Baseline §35.2. Lint/typecheck/test/build 12/12 đạt |
| 2026-08-09 | Codex | MNT-001 audit: bảo toàn patch ban đầu; loại sáu nhóm prep chưa được phê duyệt; sửa atomic customer/outbox và worker queue routing/dedup; harden CI/dependencies; local clean sandbox đạt quality gates. FND-003/FND-005/BKG-001/NTF-001 chuyển về Review vì còn GitHub/Docker verification. |
| 2026-08-09 | Codex | MNT-001 follow-up: sửa Prisma 7 root datasource config và root seed dependency resolution; regression test đạt; database trắng/deploy lần hai/seed idempotency, sáu service checks, API database health, Worker startup, quality/security gates đều đạt. Đóng BLK-002; còn GitHub-hosted CI/branch protection. |
| 2026-08-09 | Codex | Bắt đầu MNT-002 theo phê duyệt chủ dự án: bật Codex auto-review/workspace-write/network; cho phép tối đa 3 luồng độc lập có branch/worktree và file ownership; tạo Milestone 0 input pack, liên kết PRE-001–PRE-008. GitHub plugin/OAuth và dữ liệu vận hành vẫn chờ chủ dự án. |
| 2026-08-09 | Codex | Xác minh GitHub connector đã authenticated và đọc được repository `vuonmangden/vmd-website`; local remote `origin` cũng truy cập được. GitHub CLI `2.97.0` đã cài và tài khoản `vuonmangden` đã xác thực với quyền `repo`/`workflow`; PRE-001–PRE-008 vẫn chờ dữ liệu và phê duyệt của chủ dự án. |
| 2026-08-09 | Chủ dự án/Codex | Đóng DEC-004: cho phép dùng dữ liệu giả lập được gắn nhãn và có production guard cho local/development/test/demo nội bộ cho đến khi chủ dự án cung cấp hoặc yêu cầu dùng dữ liệu thật. PRE-001–PRE-008 và BLK-001 vẫn giữ nguyên trạng thái chờ dữ liệu thật được duyệt. |
| 2026-08-09 | Codex | Hoàn tất MNT-002/FND verification: tạo `main` làm default branch, retarget PR #1, sửa Prisma regression đa nền tảng và ShellCheck SC2086; GitHub-hosted run `31309744163` đạt Quality + Security. Bật branch protection với hai required checks, strict/up-to-date, admin enforcement, linear history, conversation resolution và chặn force-push/delete. Đóng BLK-003; chuyển FND-003/FND-005/BKG-001/NTF-001 và MNT-002 sang Done. PRE-001–PRE-008/BLK-001 tiếp tục độc lập, không bị synthetic data đóng sai. |
| 2026-08-09 | Codex | Bắt đầu MNT-003 trên branch `codex/mnt-003-readiness-matrix`: tạo delivery readiness matrix và task spec TST-001 cho synthetic fixtures fail-closed. IAM-001/CMS-005/NTF-002 chỉ `PLANNING_ONLY` cho đến khi PRE tương ứng có dữ liệu thật được duyệt. |
| 2026-08-09 | Codex | Hoàn tất MNT-003: readiness matrix xác định TST-001 là task duy nhất đủ điều kiện tiếp theo; IAM-001/CMS-005/NTF-002 giữ `PLANNING_ONLY`. PR #2 đạt hosted Quality + Security run `31310202234`; TST-001 chuyển Ready sau merge. |
| 2026-08-09 | Codex | Bắt đầu TST-001: tạo fixture registry có marker/deterministic IDs, opt-in và multi-environment production guard; seed/cleanup transactional, idempotent và boundary-safe. Database riêng `vmd_synthetic_test` deploy 3 migration; 9/9 unit/integration, seed hai lần, cleanup, production negative test và full cache-bypass gate đều đạt. |
| 2026-08-09 | Codex | Hoàn tất TST-001: GitHub-hosted Quality + Security run `31312405432` xanh trên PR #3. Task chuyển Done; PRE-001–PRE-008/BLK-001 không thay đổi và IAM-001/CMS-005/NTF-002 tiếp tục planning-only. |
| 2026-08-09 | Codex | Bắt đầu MNT-004 trên branch `codex/mnt-004-lane-planning`: khóa contract, file ownership, PRE checklist, security và test plan cho IAM-001/CMS-005/NTF-002; cả ba vẫn planning-only đến khi PRE-007/PRE-008 được duyệt. |
| 2026-08-09 | Codex | Hoàn tất phạm vi tài liệu MNT-004: ba planning-only spec và readiness/tracker handoff đã khóa; local lint/typecheck/test/build đạt. PRE-007/PRE-008 và BLK-001 giữ nguyên, chưa mở implementation. |
| 2026-08-10 | Chủ dự án/Codex | Nhận PRE-008 intake: tên thương hiệu, logo Drive PNG, brand board, palette, typography, hotline, email, địa chỉ, social handle và giới thiệu ngắn. Nguồn logo tải được; không commit asset hoặc mở CMS-005 trước khi chủ dự án xác nhận quyền dùng asset/font và quyết định ảnh/social/legal/CTA còn thiếu. |
| 2026-08-10 | Chủ dự án/Codex | Nhận URL public chính thức cho Facebook, TikTok, Instagram và Google Maps; liên kết được ghi vào PRE-008, không suy đoán URL Zalo/website hoặc CTA còn thiếu. |
| 2026-08-10 | Chủ dự án/Codex | Chủ dự án xác nhận quyền dùng logo/brand board cho website, phê duyệt homepage không dùng ảnh venue và Bahnschrift Condensed system font với fallback. PRE-008 chuyển Ready riêng cho CMS-005; legal/CTA và ảnh venue không tự được coi là đã duyệt. |
| 2026-08-10 | Codex | Hoàn tất CMS-005 trên branch `codex/cms-005-public-layouts`: public layout mobile-first, logo/palette/font fallback đã duyệt, phone/email/Maps/social links, loading/error/not-found và skip link. Không dùng ảnh venue, API, migration hoặc dependency. Full local quality gate và visual QA desktop/mobile đạt. |
| 2026-08-10 | Chủ dự án/Codex | Hoàn tất MNT-007: ghi nhận Supabase development/staging, JWT/JWKS, CORS/callback, email/password, session/revoke, MFA và secret-management metadata từ chủ dự án. PRE-007 vẫn partial; thiếu Supabase/admin domain/callback/CORS production nên IAM-001 chưa mở, đồng thời email provider/from identity còn thiếu cho NTF-002. Không có secret, API, migration hoặc production code; full local quality gate đạt. |
| 2026-08-10 | Chủ dự án/Codex | Hoàn tất MNT-008: ghi nhận shared Supabase, admin/CORS/callback production và Resend/Mailpit/from/reply-to/DNS/secret-store ở trạng thái đề xuất. Không tự xem proposal là cấu hình production đã duyệt; IAM-001 và NTF-002 tiếp tục planning-only đến khi chủ dự án chốt. Không có secret, API, migration hoặc production code; full local quality gate đạt. |
| 2026-08-11 | Chủ dự án/Codex | Hoàn tất MNT-009: chốt tách Supabase staging/production, admin/CORS/callback production, Railway Variables, Resend, email identity và DNS verified. IAM-001 vẫn chờ project Supabase production riêng; NTF-002 chờ Resend secret reference và scope webhook/bounce. Không có secret, API, migration hoặc production code; full local quality gate đạt. |
| 2026-08-11 | Chủ dự án/Codex | NTF-002 hoàn tất qua PR #12 với Resend staging/Mailpit, Worker 27/27 và main CI `31468483338`. IAM-001 trên PR #13 đã đạt migration local, full/hosted gates nhưng giữ Review đến Supabase staging sandbox E2E; production vẫn hard-disabled đến REL-001. |
| 2026-08-16 | Claude | Sự cố trùng lặp: triển khai lại IAM-001–005 và NTF-002 vốn đã merge từ 2026-08-11, do đọc bản tracker cũ trên nhánh `chore/mnt-001-repository-audit-cleanup` (đi sau `main` 39 commit). Sáu PR #41–#46 đã đóng, nhánh đã xóa. Không có thay đổi nào vào `main`. |
| 2026-08-16 | Claude | Đồng bộ tracker với `main`: RMS-005/006/007, BKG-002–007, PAY-001/002/003 và PAY-006 chuyển Done kèm số PR và commit merge; header tổng quan cập nhật 46 task hoàn thành. Thêm `AGENTS.md` §17 và `docs/10_AGENT_COORDINATION.md` quy định fetch `main` trước khi làm, claim task trong tracker, tiền tố nhánh theo agent và cập nhật tracker cùng PR với code. |
