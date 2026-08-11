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
| IAM-001 | FND-004, FND-005, PRE-007 | PRE-007 chốt admin/CORS/callback production và yêu cầu tách Supabase | PLANNING_ONLY | Thiếu project URL/ref/region riêng cho production; không tự dùng project staging làm production | IAM-002, IAM-004, IAM-005 |
| CMS-005 | FND-001, PRE-008 | PRE-008 Ready for CMS-005 | DONE | Layout đã hoàn tất theo asset/font/photo-free scope được duyệt ngày 2026-08-10; legal/CTA và ảnh venue không thuộc scope hiện tại | RMS-007, public website |
| NTF-002 | NTF-001, PRE-007 | PRE-007 chốt Resend/Mailpit/from/reply-to/DNS/Railway Variables | PLANNING_ONLY | Thiếu Resend API key reference theo environment và quyết định scope webhook/bounce; Mailpit chỉ cho test | NTF-004 |
| RMS-001 | FND-005, IAM-002, PRE-001 | PRE-001/PRE-006 Blocked | BLOCKED | IAM-002 và danh sách loại phòng thật chưa đạt | RMS-002, RMS-003, RMS-007 |
| BBQ-001 | FND-005, PRE-004 | PRE-004 Blocked | BLOCKED | Khu vực/bàn/slot thật chưa được duyệt | BBQ-003 |
| PAY-001 | BKG-004, PRE-003, PRE-007 | PRE-003/PRE-007 Blocked | BLOCKED | Booking, giá/cọc và provider thật chưa đạt | PAY-002 |

## 5. Lane ownership sau khi gate xanh

| Lane | Task đầu | File/module owner | Migration/DB owner | Không được chạm |
|---|---|---|---|---|
| A — Identity | IAM-001 | `apps/api` auth module, `packages/auth`, auth tests/config được task duyệt | IAM giữ độc quyền migration sequence và DB verification trong wave | `apps/web`, worker notification implementation |
| B — Public UI | CMS-005 | `apps/web`, public-only components/assets; `packages/ui` chỉ khi task scope ghi rõ | Không migration, không DB verification | API auth, Prisma, worker |
| C — Email | NTF-002 | worker notification adapter/tests và Mailpit-only config được task duyệt | Không migration; integration resources riêng | Prisma schema/seed, public web, IAM |

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

1. Merge MNT-003.
2. Triển khai TST-001 một mình trên migration/database verification lane.
3. Song song thu thập dữ liệu thật PRE-006/PRE-007 và PRE-008; đây là công việc owner, không phải synthetic implementation.
4. Sau khi từng PRE đạt, mở tối đa ba lane IAM-001, CMS-005, NTF-002 theo ownership ở trên.
5. Không mở RMS/Booking/Payment/BBQ trước các gate tương ứng.

## 9. Planning handoff

- `IAM-001`: contract, PRE checklist và ownership tại `docs/tasks/IAM-001.md`.
- `CMS-005`: layout/accessibility/asset gate tại `docs/tasks/CMS-005.md`.
- `NTF-002`: provider/Mailpit/security contract tại `docs/tasks/NTF-002.md`.
- Ba spec trên không thay đổi quyền `PLANNING_ONLY`; chỉ mở branch implementation sau khi PRE tương ứng được duyệt và matrix được cập nhật.
