# Delivery Readiness Matrix — Phase 1

## 1. Mục đích

Matrix này quyết định task có được phép triển khai hay chỉ được lập kế hoạch. Nó không thay thế dependency trong `docs/08_PROGRESS_TRACKER.md` và không biến synthetic data thành dữ liệu thật được duyệt.

## 2. Trạng thái quyền thực thi

- `BLOCKED`: thiếu dependency kỹ thuật hoặc PRE bắt buộc; không lập branch implementation.
- `PLANNING_ONLY`: được viết task spec, contract và ownership plan; không sửa production code.
- `IMPLEMENTATION_APPROVED`: tất cả dependency bắt buộc đã có evidence; được tạo branch/worktree và triển khai.
- `IN_PROGRESS`: đang có đúng một owner/branch/worktree; phạm vi đã khóa.

Chỉ progress tracker dùng các trạng thái chuẩn `Backlog`, `Ready`, `In progress`, `Blocked`, `Review`, `Done`. Cột quyền thực thi trong matrix chỉ là gate bổ sung.

## 3. Baseline evidence

| Gate | Trạng thái | Evidence |
|---|---|---|
| MNT-002 và input pack | Đạt | PR #1, squash commit `b02083a` |
| GitHub-hosted CI trên PR | Đạt | Runs `31309744163`, `31309909661` |
| CI hậu-merge trên `main` | Đạt | Run `31310013346` |
| Branch protection `main` | Đạt | Required Quality + Security; strict; admin enforcement; linear history; conversation resolution; force-push/delete disabled |
| Database foundation | Đạt | FND-005 local database trắng/idempotency/API health + hosted CI |
| Customer Core | Đạt | BKG-001 API 32/32, atomic customer/outbox và rollback regression |
| Queue/Outbox | Đạt | NTF-001 Worker 8/8, routing/dedup/fail-closed và runtime smoke |

## 4. Candidate task matrix

| Task | Tracker dependency | PRE/decision evidence | Quyền hiện tại | Lý do/gate còn thiếu | Task mở khóa |
|---|---|---|---|---|---|
| TST-001 | MNT-002, MNT-003, FND-005 | DEC-004 Closed | IMPLEMENTATION_APPROVED sau khi MNT-003 merge | Không dùng dữ liệu thật; production guard bắt buộc | Fixture kỹ thuật cho các lane non-production |
| IAM-001 | FND-004, FND-005, PRE-007 | PR #13 merge `4f341fd`; Supabase staging E2E; PR CI `31483277392`; main CI `31483454326` | DONE (STAGING_ONLY) | Production hard-disabled đến `REL-001`; MFA/RBAC thuộc task sau | IAM-002, IAM-004, IAM-005 |
| IAM-002 | IAM-001, PRE-006 | PR #17; RBAC migration/seed, local PostgreSQL verification, API 61 tests, Supabase staging trusted actor E2E và hosted run `31486190686` đạt | DONE (STAGING_ONLY) | Production MFA vẫn cần REL-001 | IAM-003, CMS/RMS/Admin dependencies |
| IAM-004 | FND-005, IAM-001 | Planning-only contract tại `docs/tasks/IAM-004.md` | PLANNING_ONLY | Audit viewer cần permission từ IAM-002; migration ownership phải tách wave | Admin/business audit |
| IAM-005 | FND-004, IAM-001 | Planning-only contract tại `docs/tasks/IAM-005.md` | PLANNING_ONLY | Permission-failure integration cần IAM-002 | Payment/security gate |
| CMS-005 | FND-001, PRE-008 | PRE-008 Ready for CMS-005 | DONE | Layout đã hoàn tất theo asset/font/photo-free scope được duyệt ngày 2026-08-10; legal/CTA và ảnh venue không thuộc scope hiện tại | RMS-007, public website |
| NTF-002 | NTF-001, PRE-007 | PR #12; Worker 27/27; PR và post-merge main CI đạt | DONE (STAGING_ONLY) | Production hard-disabled đến SPF/DKIM/REL-001; bounce/complaint thuộc `NTF-007`/OPS | NTF-004 |
| RMS-001 | FND-005, IAM-002, PRE-001 | PRE-001/PRE-006 Blocked | BLOCKED | IAM-002 và danh sách loại phòng thật chưa đạt | RMS-002, RMS-003, RMS-007 |
| BBQ-001 | FND-005, PRE-004 | PRE-004 Blocked | BLOCKED | Khu vực/bàn/slot thật chưa được duyệt | BBQ-003 |
| PAY-001 | BKG-004, PRE-003, PRE-007 | PRE-003/PRE-007 Blocked | BLOCKED | Booking, giá/cọc và provider thật chưa đạt | PAY-002 |

## 5. Lane ownership sau khi gate xanh

| Lane | Task đầu | File/module owner | Migration/DB owner | Không được chạm |
|---|---|---|---|---|
| A — Identity | IAM-001 | `apps/api` auth module, `packages/auth`, auth tests/config được task duyệt | IAM giữ độc quyền migration sequence và DB verification trong wave | `apps/web`, worker notification implementation; shared production config |
| B — Public UI | CMS-005 | `apps/web`, public-only components/assets; `packages/ui` chỉ khi task scope ghi rõ | Không migration, không DB verification | API auth, Prisma, worker |
| C — Email | NTF-002 | worker notification adapter/tests, Resend staging path và Mailpit local/test config được task duyệt | Không migration; integration resources riêng | Prisma schema/seed, public web, IAM, shared production config |

Nếu hai task cần cùng file shared/config, task bắt đầu sau phải chờ merge task trước hoặc điều phối lại ownership; không cho phép concurrent edit.

## 6. Migration và database verification

- Chỉ một task có migration/database ownership tại một thời điểm.
- Mỗi task dùng project/database verification riêng, không dùng chung với task khác đang chạy.
- Merge order quyết định migration sequence; không sửa migration đã merge.
- Database trắng, deploy lần hai và seed/fixture idempotency phải đạt trước Review.
- Rollback là revert forward bằng migration/code mới; không reset/drop dữ liệu đã dùng làm evidence.

## 7. Merge gates chung

- Branch/worktree/owner và file scope được ghi trong task trước khi code.
- `git diff --check`, lint, typecheck, unit/integration test liên quan, build và security checks đạt.
- Migration/OpenAPI/permission/audit/UI states được kiểm tra khi áp dụng.
- Pull Request phải qua required GitHub checks trên `main` và conversation resolution.
- Synthetic work phải ghi rõ không đóng PRE/BLK và có automated production-rejection test.

## 8. Thứ tự được phép hiện tại

1. NTF-002 đã Done; không bật production hoặc mở webhook/bounce trong scope này.
2. Hoàn tất Supabase staging sandbox E2E cho IAM-001, sau đó mới chuyển Done/merge và mở dependency tiếp theo nếu PRE-006 cho phép.
3. `REL-001` tạo Supabase production project riêng và DNS xác minh trước go-live; production luôn fail-closed trước các gate đó.
4. Không mở RMS/Booking/Payment/BBQ trước các gate tương ứng.

## 9. Planning handoff

- `IAM-001`: contract, PRE checklist và ownership tại `docs/tasks/IAM-001.md`.
- `CMS-005`: layout/accessibility/asset gate tại `docs/tasks/CMS-005.md`.
- `NTF-002`: provider/Mailpit/security contract tại `docs/tasks/NTF-002.md`.
- `NTF-002` đã Done staging-only; `IAM-001` đang Review staging-only. CMS-005 đã Done. Không task nào được xem là được duyệt production chỉ từ các trạng thái này.
