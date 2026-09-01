# MNT-015 — Production Readiness Rebaseline

## 1. Thông tin task

- **Task ID:** `MNT-015`
- **Trạng thái:** In progress
- **Mục tiêu:** Khôi phục một baseline điều phối và quality gate chính xác sau khi các PR sandbox đã merge và dữ liệu vận hành PRE-001–PRE-005 được chủ dự án duyệt.
- **Branch:** `codex/mnt-015-production-readiness-rebaseline`
- **Phụ thuộc:** `MNT-014`, PR #20–#39 đã merge, intake chủ dự án ngày 2026-09-01.

## 2. Phạm vi

- Đồng bộ `docs/08_PROGRESS_TRACKER.md` với code thực tế trên `main` cho các task đã merge.
- Đồng bộ `docs/10_DELIVERY_READINESS_MATRIX.md` với PRE và dependency hiện hành.
- Ghi nhận dữ liệu vận hành đã duyệt tại `docs/09_MILESTONE_0_INPUT_PACK.md` mà không ghi secret.
- Sửa Node development runtime gate theo ADR-001: chấp nhận mọi Node 24.x; CI vẫn pin Node 24.14.0 để tái lập.
- Chạy full lint, typecheck, test, build và Prisma/Compose validation trên baseline hiện tại.
- Lập danh sách task production còn thiếu spec và thứ tự đường găng.

## 3. Ngoài phạm vi

- Không triển khai thêm nghiệp vụ CMS, BBQ, booking, payment hoặc notification.
- Không tạo/sửa migration hoặc seed production.
- Không cấu hình secret, provider hoặc triển khai production.
- Không xóa hoặc commit các artifact untracked của Claude Code khi chưa xác định ownership.
- Không thay dependency hoặc major version.

## 4. Quy tắc bắt buộc

- Git history và code trên `main` là bằng chứng implementation; trạng thái `Done` chỉ ghi khi PR đã merge và hosted CI có bằng chứng.
- Phân biệt rõ sandbox/staging-only với production-ready.
- PRE được cập nhật từ dữ liệu chủ dự án, không tự suy đoán giá, bàn, chính sách hoặc secret.
- Runtime local phải cùng major Node 24 với ADR; patch version khác CI không được làm developer gate thất bại.

## 5. Acceptance criteria

- Tracker không còn ghi Backlog/In progress/Review cho task đã merge qua PR #20–#39.
- Readiness matrix mở đúng các task dựa trên PRE-001–PRE-005 và giữ PRE-007 production gate.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm ci:prisma` đạt với Node 24.x.
- `git diff --check` đạt; không có migration, dependency hoặc secret mới.
- Có backlog theo đường găng và task tiếp theo đủ điều kiện.

## 6. Security

- Không đưa Supabase URL production, database URL, SePay credential, tài khoản ngân hàng, OAuth token hoặc Zalo secret vào Git.
- Google Drive cá nhân chỉ là proposal; media production tiếp tục fail-closed đến khi storage review đạt.
- Không thay đổi branch protection hoặc production infrastructure trong task này.

## 7. Definition of Done

- Tài liệu điều phối, runtime gate và evidence thống nhất.
- Full local gate đạt.
- Hosted CI đạt trên PR trước khi merge.
- Báo cáo nêu file thay đổi, test, security, blocker và task tiếp theo.
