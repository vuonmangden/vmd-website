# MNT-015 — Production Readiness Rebaseline

## 1. Thông tin task

- **Task ID:** `MNT-015`
- **Trạng thái:** Done — PR #89; hosted CI run `33505995730`
- **Mục tiêu:** Khôi phục một baseline điều phối và quality gate chính xác sau khi các PR sandbox đã merge và dữ liệu vận hành PRE-001–PRE-005 được chủ dự án duyệt.
- **Branch:** `codex/mnt-015-production-readiness-rebaseline`
- **Phụ thuộc:** `MNT-014`, implementation đã merge tới PR #88, intake chủ dự án ngày 2026-09-01.

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

- Tracker không còn ghi `Review` cho task implementation đã merge tới PR #88.
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

## 8. Kết quả audit local

- Baseline đã đồng bộ với `origin/main` commit `13da64a`; hosted main CI `32818075910` đạt.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` đạt 12/12 workspace với Node 24 LTS và pnpm 11.9.0.
- Test chính: API 433/433, web 52/52, worker 72/72, admin 11/11; script/infra test đạt.
- `pnpm ci:prisma` đạt với schema và 28 migration directory hợp lệ.
- Docker CLI/Compose có sẵn nhưng Docker engine không hoạt động, nên image build/smoke vẫn là evidence bắt buộc của `REL-001`.

## 9. Findings và backlog đường găng

1. `RMS-008`: seed/upsert phòng 201–207, 301 inactive, rate 2026-09-01, đệm 200.000 và VAT chưa gồm; loại dependency public vào fixture synthetic.
2. `BKG-010`: đổi public room booking/payment boundary từ synthetic sang production-safe; thống nhất hold 30 phút (public hiện hard-code 15, các service khác mặc định 120); thực thi đổi ngày thật trong transaction, cập nhật occupancy/giá/history và lưu lượt đổi.
3. `BBQ-007`: thay 5 khu/29 bàn/2 slot/cọc 150.000 bằng 3 khu × 10 bàn, quota 120 khách/ngày, không cọc, nhóm 5–20 chờ xác nhận và menu đã duyệt.
4. `ADM-003`: thay trang Admin shell bằng console tối thiểu cho booking, BBQ, payment/reconciliation, CMS, staff, report và settings.
5. `PAY-007`: production SePay adapter/config, webhook/auth/reconciliation và QR thật; secret chỉ cấu hình qua secret manager.
6. `NTF-007`: atomic claim/lease và provider idempotency cho notification; kiểm thử crash/retry/nhiều worker.
7. Hoàn tất `REL-001`: bỏ hard-disable production có kiểm soát cho Supabase/email/storage, container smoke, staging, migration và rollback.
8. `QLT-001`, security gate trọng tâm, observability và backup/restore trước `REL-002`.

Chi tiết dependency và blocker nằm tại `docs/10_DELIVERY_READINESS_MATRIX.md`.

Policy Word được đọc trực tiếp bằng Pandoc: các tier hoàn tiền, cửa sổ đổi 60 ngày và nguyên tắc không hoàn chênh lệch giá thấp hơn đã khớp `CancellationPolicyService`. Nội dung BBQ nói về hoàn cọc bị supersede bởi xác nhận mới nhất “không có cọc giữ bàn”; vì vậy không được đưa cọc BBQ trở lại production.
