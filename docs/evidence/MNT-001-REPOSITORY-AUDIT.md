# MNT-001 — Repository Audit Evidence

## Baseline và bảo toàn thay đổi

- Baseline: `181af71bb0901ad48560032b4dc311e72bc9d5c8`.
- Branch audit: `chore/mnt-001-repository-audit-cleanup`.
- Patch trước cleanup: `docs/evidence/MNT-001-PRE-CLEANUP-DIFF.patch` (63,546 bytes), gồm tracked và untracked changes tại thời điểm bắt đầu.
- Không dùng reset hard, clean, rewrite history, push, merge hoặc xóa volume.

## Kết quả review

- Giữ nguyên foundation hợp lệ của FND-001, FND-002 và FND-004.
- Sửa BKG-001 để customer và outbox event cùng transaction; thêm rollback regression.
- Sửa NTF-001 để worker đăng ký queue, fail-closed khi thiếu route và deduplicate bằng outbox event ID.
- Harden FND-003: immutable pins, read-only permissions, timeout/concurrency, deterministic cache/install, Prisma/migration check, secret/dependency scan.
- Loại cả sáu nhóm PREP chưa commit vì chưa có task/phê duyệt hoặc có lỗi an toàn/kỹ thuật; không triển khai chức năng sản phẩm mới.

## Dependency và security

- Trước remediation: 5 High, 5 Moderate.
- Sau remediation: 0 Critical, 0 High, 3 Moderate (`pnpm audit --prod --audit-level high`, exit 0).
- Cập nhật tương thích: Next 16.3.0; overrides Playwright 1.55.1 và js-yaml 5.2.2; không nâng major.
- Gitleaks 8.29.1: source tree đạt; Git history 13 commits đạt; synthetic generic API key ngoài repository được phát hiện như kỳ vọng.
- `actionlint` 1.7.12: workflow đạt; binary/archive checksum đối chiếu bản phát hành chính thức.

## Quality gates

Clean sandbox `C:\tmp\vmd-mnt001-test3`, cài bằng frozen lockfile với Node 24.14.0 và pnpm 11.9.0:

- lint: đạt 12 workspaces và root scripts/mocks;
- typecheck: đạt 12 workspaces;
- tests: API 32/32, Worker 8/8, web 1/1, admin 1/1, testing package 1/1, scripts/mocks 10/10;
- build: đạt 12/12, gồm bốn application shells (web, admin, api, worker);
- Prisma schema và ba migration directories: đạt.

Turbo trực tiếp trong OneDrive gặp Windows cloud-file error 389; clean sandbox được dùng để loại trừ cache và filesystem-provider interference.

## Docker, database và runtime verification bổ sung

Docker Desktop đã khả dụng trong phiên xác minh tiếp theo ngày 2026-08-09. Một project verification local tách biệt được dùng, không xóa volume hoặc dữ liệu hiện có:

- Compose config hợp lệ; sáu long-running services healthy.
- PostgreSQL `SELECT 1`, Redis `PING`, Mailpit, MinIO bucket/marker và mock SePay/Zalo đều đạt.
- Sửa blocker Prisma 7 bằng root `prisma.config.ts` với `datasource.url` và migrations path theo API 7.7.0; thêm regression test chạy CLI `migrate deploy` với datasource cô lập.
- Ba migration áp dụng thành công từ database trắng; deploy lần hai trả `No pending migrations to apply`.
- Root seed được khai báo trực tiếp các runtime dependency đã có trong lock graph (`@prisma/adapter-pg`, `pg`); chạy hai lần thành công và truy vấn xác nhận đúng một `app.name` record.
- API `GET /api/v1/health/live` và `GET /api/v1/health/dependencies` trả HTTP 200, database `healthy`.
- Worker khởi động với PostgreSQL/Redis và log `Outbox processor started`.
- Quality gate chạy lại đạt: lint, typecheck, API 32/32, Worker 8/8, web/admin/testing 3/3, root scripts/mocks 11/11 và build 12 workspaces.
- Compose config, actionlint, Gitleaks 15 commits và production dependency audit đạt; audit vẫn còn 3 Moderate, 0 High/Critical.

GitHub-hosted CI và branch protection vẫn cần xác minh ngoài local; không ghi hai bước này là đã đạt.

## Trạng thái task sau audit

- Done: FND-001, FND-002, FND-004.
- Review: FND-003, FND-005, BKG-001, NTF-001, MNT-001; các blocker Docker/database/runtime local đã được đóng, FND-003 còn chờ GitHub-hosted verification.
- Sáu PREP audit groups: không giữ, không tính là task hoàn thành.

Public Website chưa sẵn sàng triển khai nghiệp vụ: cần xác minh GitHub CI/branch protection và chốt Milestone 0 inputs trước các module sản phẩm.

## Commit audit

- `4acedd7` — dependency remediation, deterministic bootstrap, customer/outbox transaction và worker queue safety.
- `44e4ea8` — CI quality/security hardening và Prisma/migration checker.
- Commit tài liệu đóng audit chứa task, tracker, ADR, workflow notes và hai evidence files.
