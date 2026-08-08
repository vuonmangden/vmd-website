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
| Trạng thái tổng thể | Foundation đang triển khai |
| Milestone hiện tại | Milestone 1 |
| Task đang thực hiện | Không (Foundation hoàn tất) |
| Task hoàn thành | 4 |
| Blocker mở | Xem Milestone 0 và Open Decisions |
| Cập nhật gần nhất | 2026-08-08 |

## 3. Milestone 0 — Chốt đầu vào

| Task ID | Nội dung | Trạng thái | Owner | Bằng chứng/Link | Blocker/Ghi chú |
|---|---|---|---|---|---|
| PRE-001 | Chốt danh sách loại phòng | Backlog | TBD |  | Không được giả định |
| PRE-002 | Chốt danh sách phòng thực tế | Backlog | TBD |  | Cần mã phòng, sức chứa, trạng thái |
| PRE-003 | Chốt bảng giá, phụ thu và cọc | Backlog | TBD |  | Blocker cho Price Engine/Booking |
| PRE-004 | Chốt khu vực, bàn, khung giờ và combo BBQ | Backlog | TBD |  | Blocker cho BBQ |
| PRE-005 | Chốt chính sách hủy, đổi lịch, hoàn tiền | Backlog | TBD |  | Blocker cho Booking/Payment |
| PRE-006 | Chốt vai trò và quyền nhân sự | Backlog | TBD |  | Blocker cho RBAC/Admin |
| PRE-007 | Chuẩn bị domain, Supabase, SePay, email, Zalo | Backlog | TBD |  | Không ghi secret vào tracker |
| PRE-008 | Chốt bộ nhận diện, ảnh và nội dung ban đầu | Backlog | TBD |  | Cần asset/source được duyệt |

**Gate:** Không triển khai Price Engine, Booking hoặc Payment bằng dữ liệu giả rồi kỳ vọng sửa sau.

## 4. Milestone 1 — Foundation

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Migration | Tests | Security | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| FND-001 | Khởi tạo monorepo | Done | Không | `chore/fnd-001-initialize-monorepo` / `3c5036a`, `8913286` | N/A | Node 24.14.0; pnpm 11.9.0; frozen install đạt; lint/typecheck/test/build 12/12 đạt với Turbo cache bypass; web/admin HTTP 200, API port 3002, worker duy trì tiến trình | Node 22.14.0 bị runtime gate từ chối; local secret/client-env/ignore checks đạt | Human review đã duyệt; còn 3 deprecated transitive dependencies (`glob@10.5.0`, `glob@7.2.3`, `inflight@1.0.6`) |
| FND-002 | Local development | Done | FND-001 | `chore/fnd-002-local-development` / `01ce62e`, `eb74fe9`, `10ef3cb` | Không | Node 24.14.0; pnpm 11.9.0 frozen install đạt; lint/typecheck/test/build 12/12 đạt, cache bypass; 7/7 unit test FND-002 đạt; Compose config và 6/6 service healthy | Loopback-only ports; pinned images; không latest/privileged/socket/secret; `.env` fallback, env boundary và ignore checks đạt | Human review đã duyệt; read-only MinIO check; marker giữ nguyên timestamp/ETag sau restart; down giữ 4 named volumes; evidence: `docs/evidence/FND-002-LOCAL-ENVIRONMENT.md` |
| FND-003 | CI | Backlog | FND-001 |  | N/A |  |  | Scan secret/dependency |
| FND-004 | API foundation | Done | FND-001, FND-002 | `chore/fnd-004-api-foundation` | N/A | lint/typecheck/test/build 12/12 đạt; 11 API tests (correlation-id 4, exception-filter 3, health 3, app-module 1) đạt; 4 app shells build thành công | Không stack trace trong response; không secret/PII trong log; correlation ID validate UUID | Error format §25.3, correlation ID §40, validation pipe, global exception filter, Swagger `/api/docs`, health endpoints `/health/{live,ready,dependencies}`, structured logger `@vmd/logging` |
| FND-005 | Database foundation | Done | FND-002, FND-004 | `chore/fnd-005-database-foundation` | `20260807000000_initial_foundation` — 4 tables, 3 extensions, 2 indexes | lint/typecheck/test/build 12/12 đạt; 16 API tests (prisma-service 3, prisma-module 1, health 4, correlation-id 4, exception-filter 3, app-module 1) đạt | DATABASE_URL server-only; connection string không log; audit_logs immutable; app_settings secret reference only | Prisma 7.7.0 + @prisma/adapter-pg; audit_logs, idempotency_keys, outbox_events, app_settings; pgcrypto, btree_gist, citext; PrismaModule global; health/dependencies check DB |

**Gate:** CI xanh; local chạy được; migration và seed chạy được từ database trắng.

## 5. Milestone 2 — Identity, RBAC và bảo mật nền

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests/Security | Ghi chú |
|---|---|---|---|---|---|---|
| IAM-001 | Staff authentication | Backlog | FND-004, FND-005, PRE-007 |  |  | Supabase Auth |
| IAM-002 | Roles và permissions | Backlog | IAM-001, PRE-006 |  |  | Seed permission |
| IAM-003 | Admin route protection | Backlog | IAM-002 |  |  | Frontend + backend |
| IAM-004 | Audit service | Backlog | FND-005, IAM-001 |  |  | Immutable operational audit |
| IAM-005 | Security middleware | Backlog | FND-004, IAM-001 |  |  | Headers, CORS, rate limit, CSRF |

**Gate:** Authorization hoạt động trước Payment hoặc Admin nghiệp vụ.

## 6. Milestone 3 — CMS và website công khai

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests | Ghi chú |
|---|---|---|---|---|---|---|
| CMS-001 | Site settings | Backlog | FND-005, IAM-002, PRE-008 |  |  |  |
| CMS-002 | Content pages | Backlog | CMS-001 |  |  | Draft/publish |
| CMS-003 | Media | Backlog | IAM-002, PRE-007 |  |  | Upload security |
| CMS-004 | Blog | Backlog | CMS-002, CMS-003 |  |  | SEO metadata |
| CMS-005 | Public layouts | Backlog | FND-001, PRE-008 |  |  | Mobile-first |
| CMS-006 | Contact | Backlog | FND-004, IAM-002 |  |  | Validation/rate limit |
| CMS-007 | SEO | Backlog | CMS-002, CMS-004, CMS-005 |  |  | Sitemap, robots, JSON-LD |

**Gate:** Website nội dung deploy staging độc lập.

## 7. Milestone 4 — Phòng, giá và tồn phòng

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests | Ghi chú |
|---|---|---|---|---|---|---|
| RMS-001 | Room Types | Backlog | FND-005, IAM-002, PRE-001 |  |  |  |
| RMS-002 | Physical Rooms | Backlog | RMS-001, PRE-002 |  |  |  |
| RMS-003 | Rate Rules | Backlog | RMS-001, PRE-003 |  |  | Tiền integer VND |
| RMS-004 | Room Blocks | Backlog | RMS-002 |  |  |  |
| RMS-005 | Price Engine | Backlog | RMS-003, PRE-003, PRE-005 |  |  | Unit test bắt buộc |
| RMS-006 | Availability Search | Backlog | RMS-002, RMS-004 |  |  | Integration/concurrency |
| RMS-007 | Public room pages | Backlog | RMS-001, RMS-005, RMS-006, CMS-005 |  |  |  |

**Gate:** Price Engine unit test và Availability integration test đạt.

## 8. Milestone 5 — Booking phòng

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests | Ghi chú |
|---|---|---|---|---|---|---|
| BKG-001 | Customer Core | Backlog | FND-005 |  |  | Consent/PII |
| BKG-002 | Occupancy Model | Backlog | RMS-002 |  |  | Unique `(room_id, stay_date)` |
| BKG-003 | Resource Hold | Backlog | BKG-002 |  |  | TTL/expiry/retry |
| BKG-004 | Booking Creation | Backlog | BKG-001, BKG-003, RMS-005 |  |  | Idempotency bắt buộc |
| BKG-005 | Booking State Machine | Backlog | BKG-004 |  |  | Status history |
| BKG-006 | Booking Checkout UI | Backlog | BKG-004, RMS-007 |  |  | Mobile/loading/error |
| BKG-007 | Booking Lookup | Backlog | BKG-004 |  |  | Rate limit/IDOR |
| BKG-008 | Admin Booking | Backlog | BKG-005, IAM-003 |  |  | Permission/audit |
| BKG-009 | Change/Cancel | Backlog | BKG-005, PRE-005 |  |  | Transaction/reminder |

**Gate:** E2E booking, concurrency và idempotency replay đạt.

## 9. Milestone 6 — Thanh toán và đối soát

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests | Ghi chú |
|---|---|---|---|---|---|---|
| PAY-001 | Payment Intent | Backlog | BKG-004, PRE-003, PRE-007 |  |  |  |
| PAY-002 | SePay Webhook Ingestion | Backlog | PAY-001, IAM-005 |  |  | Verify + raw event |
| PAY-003 | Idempotent Payment Processing | Backlog | PAY-002 |  |  | Unique provider transaction |
| PAY-004 | Reconciliation | Backlog | PAY-003, PRE-005 |  |  | Mismatch/late payment |
| PAY-005 | Admin Payment | Backlog | PAY-004, IAM-003, IAM-004 |  |  | Financial audit |
| PAY-006 | Payment Status UI | Backlog | PAY-003, BKG-006 |  |  | Client không tự xác nhận |

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
| NTF-001 | Queue và Outbox | Backlog | FND-005 |  |  | Retry/dedup/dead-letter |
| NTF-002 | Email Adapter | Backlog | NTF-001, PRE-007 |  |  | Mailpit/sandbox |
| NTF-003 | Zalo Adapter | Backlog | NTF-001, PRE-007 |  |  | Template được duyệt |
| NTF-004 | Booking Notifications | Backlog | NTF-002, NTF-003, BKG-005, PAY-003 |  |  |  |
| NTF-005 | Reminders | Backlog | NTF-004, PRE-005 |  |  | T-7/T-3/T-1 |
| NTF-006 | Admin Failure Inbox | Backlog | NTF-001, IAM-003 |  |  | Retry có audit |

**Gate:** Retry/dedup đạt; booking hủy/đổi không nhận reminder sai.

## 12. Milestone 9 — Vận hành, báo cáo và quản trị

| Task ID | Nội dung | Trạng thái | Dependency | Branch/PR | Tests | Ghi chú |
|---|---|---|---|---|---|---|
| OPS-001 | Operations Dashboard | Backlog | BKG-008, BBQ-006, PAY-005 |  |  |  |
| OPS-002 | Calendar | Backlog | BKG-008, BBQ-006 |  |  | Timezone |
| OPS-003 | Check-in/Check-out | Backlog | BKG-005, IAM-004 |  |  | Audit |
| OPS-004 | Customer View | Backlog | BKG-001, IAM-003 |  |  | PII/permission |
| RPT-001 | Reports | Backlog | PAY-005, OPS-001 |  |  | Metric definitions |
| RPT-002 | Export | Backlog | RPT-001, IAM-003 |  |  | Audit/formula injection |
| ADM-001 | Staff Management | Backlog | IAM-002, IAM-003 |  |  | Prevent privilege escalation |
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

## 15. Blocker log

| ID | Ngày mở | Liên quan | Mô tả | Ảnh hưởng | Owner | Trạng thái | Quyết định/Ngày đóng |
|---|---|---|---|---|---|---|---|
| BLK-001 | 2026-08-05 | PRE-* | Dữ liệu vận hành Milestone 0 chưa được xác nhận trong tracker | Chưa thể triển khai module nghiệp vụ | TBD | Open |  |

## 16. Open decisions

| ID | Câu hỏi cần quyết định | Task bị ảnh hưởng | Owner | Hạn | Trạng thái | ADR |
|---|---|---|---|---|---|---|
| DEC-001 | Xác nhận toolchain, test runner, package scope và secret scanning | FND-001 | Chủ dự án | 2026-08-05 | Closed | `docs/decisions/ADR-001-FOUNDATION-TOOLCHAIN.md` |
| DEC-002 | Xác nhận lệnh chuẩn và toolchain CI | FND-003 | TBD | Trước FND-003 | Open |  |
| DEC-003 | Xác nhận dữ liệu và chính sách Milestone 0 | RMS/BKG/PAY/BBQ | TBD | Trước module tương ứng | Open |  |

## 17. Defect summary

| Severity | Open | In progress | Fixed pending verify | Closed |
|---|---:|---:|---:|---:|
| P0 | 0 | 0 | 0 | 0 |
| P1 | 0 | 0 | 0 | 0 |
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
