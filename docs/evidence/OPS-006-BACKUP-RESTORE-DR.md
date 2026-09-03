# OPS-006 — Backup, Restore và DR (Restore drill)

**Ngày:** 2026-09-03 · **Thực hiện:** Claude · **Trạng thái: In progress, chưa Done**

## Vì sao chưa đánh dấu Done

Dự án này có kỷ luật rất rõ: chỉ đánh dấu Done khi có bằng chứng thật đã chạy, không phải script viết xong nhưng chưa test. Docker Desktop **dừng hoạt động giữa phiên làm việc này** (đã dùng để test sống ở `SEC-002`/`PERF-001/002`/`OPS-005` trước đó trong cùng phiên) và không khởi động lại được. Phần "Restore drill" — bằng chứng quan trọng nhất của task này — **cần chạy thật để có giá trị**: một script backup/restore chưa từng chạy qua không khác gì code chưa test. Vì vậy:

- **Đã làm**: viết script backup/restore, unit test đầy đủ (mock hoàn toàn, không cần Docker để chạy), viết runbook DR.
- **Chưa làm**: chạy drill thật (backup dữ liệu seed thật → giả lập mất dữ liệu → restore → xác nhận toàn vẹn) — cần Docker.

Task này nên được coi là **chuẩn bị xong, chờ xác minh** — cập nhật dòng tracker thành Done chỉ sau khi drill thật chạy qua ở phiên có Docker.

## Đã làm — script và test

- `scripts/db-backup-restore-lib.mjs`: `backupDatabase()` chạy `docker compose exec postgres pg_dump -F c` (image `postgres:16-alpine` đã có sẵn `pg_dump`/`pg_restore`, không cần cài Postgres client trên máy host), ghi ra file `.dump` (định dạng nén, restore chọn lọc được, không phải SQL thô). `restoreDatabase()` chạy `pg_restore --clean --if-exists --no-owner` — `--clean --if-exists` nghĩa là restore lên một DB **đang có dữ liệu** (kịch bản DR thật, không chỉ database trống) vẫn an toàn, không cần bước xóa thủ công trước.
- `scripts/db-backup.mjs` / `scripts/db-restore.mjs`: entrypoint mỏng, theo đúng quy ước sẵn có của `scripts/ci-prisma-check.mjs` (logic trong file `-lib.mjs` để test được, entrypoint chỉ gọi và xử lý exit code).
- `scripts/db-backup-restore-lib.test.mjs`: 5 test, dùng dependency injection cho `spawn`/`mkdir`/`write`/`readFile` (đúng mẫu `infra-runner.test.mjs` đã có) — verify đúng lệnh `docker compose ... pg_dump`/`pg_restore` được gọi với đúng tham số, và xử lý lỗi đúng khi command thất bại. **Không cần Docker để chạy** — toàn bộ mock.
- `.gitignore`: thêm `backups/`/`*.dump` — dump chứa dữ liệu khách hàng/booking thật, không bao giờ được commit.

## Runbook DR (dự thảo, chưa drill)

**Tần suất backup đề xuất**: hằng ngày, ngoài giờ vận hành (theo múi giờ Asia/Ho_Chi_Minh) — dữ liệu Phase 1 quy mô nhỏ (2.000–5.000 lượt/ngày theo `PERF-001`), một bản/ngày là hợp lý, không cần continuous backup (WAL streaming) ở giai đoạn này. **Retention đề xuất**: giữ 7 bản gần nhất cục bộ + tối thiểu 1 bản/tuần lưu ngoài máy chủ (S3/object storage — phụ thuộc `PRE-007` chưa chốt nhà cung cấp storage thật, hiện tại `backups/` chỉ ở local, **chưa có off-site copy** — rủi ro thật, cần chủ dự án chốt storage trước khi production go-live).

**Quy trình restore** (dự kiến, sẽ cập nhật sau khi drill thật):
1. Xác nhận bản backup cần dùng (`ls backups/` hoặc nơi lưu trữ ngoài, theo tên file `vmd-backup-<ISO-timestamp>.dump`).
2. `node scripts/db-restore.mjs backups/<file>.dump` — script tự đọc `.env`/`.env.example` để biết `POSTGRES_USER`/`POSTGRES_DB`, chạy `pg_restore --clean --if-exists` qua `docker compose exec`.
3. Xác nhận toàn vẹn: đếm số dòng ở vài bảng trọng yếu (`bookings`, `bbq_reservations`, `customers`, `payment_intents`) so với thời điểm backup; chạy `pnpm --filter @vmd/api run test` để xác nhận schema tương thích.
4. Ghi lại thời gian thực hiện (RTO thực tế) để đối chiếu với mục tiêu bên dưới.

**RTO/RPO ước tính** (chưa xác nhận bằng drill thật): RPO ≤ 24h (khớp tần suất backup hằng ngày đề xuất ở trên); RTO ước tính vài phút cho một database quy mô Phase 1 (dump/restore một database nhỏ qua `pg_dump`/`pg_restore` thường tính bằng giây tới vài phút, không phải giờ) — **con số này cần drill thật để xác nhận**, không phải suy đoán.

## Việc còn lại

1. **Chạy drill thật** ngay khi có Docker: `node scripts/db-backup.mjs` trên DB đã seed → xóa/làm hỏng một bảng có chủ đích (mô phỏng sự cố) → `node scripts/db-restore.mjs backups/<file>.dump` → xác nhận dữ liệu khôi phục đúng → ghi RTO thực tế. Cập nhật dòng tracker này thành Done kèm bằng chứng.
2. **Off-site backup storage**: chờ `PRE-007` chốt nhà cung cấp object storage thật (đã ghi nhận là gap ở `CMS-003` cho ảnh, cùng nhóm hạ tầng) — khi có, mở rộng `backupDatabase()` để upload lên đó thay vì chỉ lưu local.
3. **Tự động hóa lịch backup hằng ngày**: script hiện tại chạy thủ công (`node scripts/db-backup.mjs`) — khi có staging/production thật, cần một cơ chế lịch (cron trên server, hoặc scheduled job của nhà cung cấp hosting) để chạy tự động, ngoài phạm vi task này (thuộc `REL-001`/hạ tầng triển khai).
