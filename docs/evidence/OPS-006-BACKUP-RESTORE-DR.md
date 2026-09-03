# OPS-006 — Backup, Restore và DR (Restore drill)

**Ngày:** 2026-09-03 · **Thực hiện:** Claude · **Trạng thái: Done**

## Cập nhật 2026-09-03 — drill thật đã chạy, Docker đã hoạt động lại

Docker Desktop hoạt động lại giữa phiên làm việc. Chạy drill thật theo đúng quy trình đã dự thảo bên dưới, **trên một Postgres container cô lập, riêng biệt** (không dùng chung DB với stack `vmd-mnt001-verification-*` đang chạy sẵn — dự án này nhiều agent dùng chung repo, tránh rủi ro làm hỏng dữ liệu của phiên khác đang chạy song song):

1. Khởi tạo container Postgres cô lập (cùng image `postgres:16.14-alpine3.23` như compose thật, project name riêng `vmd-ops006-drill`, port 5439, volume riêng) qua đúng `infrastructure/docker/compose.yaml`.
2. Áp dụng schema thật: `pnpm db:migrate:deploy` — cả 28 migration áp dụng thành công.
3. Seed dữ liệu production-config thật: `pnpm db:seed` — 168 dòng trên 10 bảng (`app_settings`=5, `roles`=5, `permissions`=15, `room_types`=8, `rooms`=8, `room_rate_rules`=14, `bbq_areas`=3, `bbq_tables`=30, `bbq_menu_items`=76, `bbq_combos`=4).
4. `node scripts/db-backup.mjs` (script thật, không sửa) → `backups/vmd-backup-2026-09-03T07-03-04-786Z.dump`, 114,507 bytes.
5. **Giả lập sự cố mất dữ liệu có chủ đích**: `DROP TABLE bbq_menu_items CASCADE`, `TRUNCATE room_rate_rules, rooms, room_types CASCADE`, `DELETE FROM app_settings` — xác nhận mất dữ liệu thật (`bbq_menu_items` không còn tồn tại, các bảng truncate còn 0 dòng).
6. `node scripts/db-restore.mjs backups/vmd-backup-2026-09-03T07-03-04-786Z.dump` (script thật, không sửa) → **RTO thực đo: 2.39 giây**.
7. **Xác nhận toàn vẹn dữ liệu**: đếm lại dòng ở cả 10 bảng — khớp chính xác 100% với trước khi làm hỏng (`bbq_menu_items` khôi phục lại đủ 76 dòng dù đã bị `DROP TABLE`). Spot-check nội dung thật (tên phòng, status) đúng nguyên vẹn.
8. Dọn dẹp: `docker compose down -v` xoá sạch container/network/volume cô lập; xác nhận stack `vmd-mnt001-verification-*` (dùng chung với agent khác) không bị đụng tới trong suốt quá trình.

**Kết quả**: script backup/restore hoạt động đúng như thiết kế qua toàn bộ chuỗi thật (Docker → `pg_dump`/`pg_restore` → schema Prisma thật → dữ liệu seed thật → mất dữ liệu thật → khôi phục thật), không phải suy đoán từ unit test mock. RTO thực tế (2.39s) thấp hơn nhiều so với ước tính ban đầu ("vài phút") — hợp lý vì quy mô dữ liệu Phase 1 còn nhỏ.

## (Trạng thái trước khi có Docker — giữ lại để tham khảo)

Dự án này có kỷ luật rất rõ: chỉ đánh dấu Done khi có bằng chứng thật đã chạy, không phải script viết xong nhưng chưa test. Docker Desktop **dừng hoạt động giữa phiên làm việc** (đã dùng để test sống ở `SEC-002`/`PERF-001/002`/`OPS-005` trước đó trong cùng phiên) khiến drill thật ban đầu không chạy được:

- **Đã làm lúc đó**: viết script backup/restore, unit test đầy đủ (mock hoàn toàn, không cần Docker để chạy), viết runbook DR.
- **Chưa làm lúc đó**: chạy drill thật — nay đã hoàn tất, xem mục cập nhật ở trên.

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

**RTO/RPO**: RPO ≤ 24h (khớp tần suất backup hằng ngày đề xuất ở trên, chưa thay đổi). RTO — **xác nhận bằng drill thật ngày 2026-09-03: 2.39 giây** cho dữ liệu quy mô Phase 1 (168 dòng/10 bảng) — thấp hơn nhiều so với ước tính ban đầu ("vài phút"); con số này sẽ tăng theo quy mô dữ liệu thật khi có traffic production, nhưng xác nhận cơ chế `pg_dump -F c`/`pg_restore --clean --if-exists` bản thân không phải là nút thắt cổ chai ở quy mô này.

## Việc còn lại

1. ~~Chạy drill thật ngay khi có Docker~~ — **Đã hoàn tất 2026-09-03**, xem mục cập nhật ở trên.
2. **Off-site backup storage**: chờ `PRE-007` chốt nhà cung cấp object storage thật (đã ghi nhận là gap ở `CMS-003` cho ảnh, cùng nhóm hạ tầng) — khi có, mở rộng `backupDatabase()` để upload lên đó thay vì chỉ lưu local. Vẫn ngoài phạm vi task này.
3. **Tự động hóa lịch backup hằng ngày**: script hiện tại chạy thủ công (`node scripts/db-backup.mjs`) — khi có staging/production thật, cần một cơ chế lịch (cron trên server, hoặc scheduled job của nhà cung cấp hosting) để chạy tự động, ngoài phạm vi task này (thuộc `REL-001`/hạ tầng triển khai).
4. **Drill này chạy trên dữ liệu production-config** (`app_settings`, RBAC, phòng/giá, BBQ) — chưa có dữ liệu booking/khách hàng thật (`ALLOW_SYNTHETIC_DATA` không bật trong drill để giữ đúng dữ liệu production-shape, không phải fixture giả). Nên lặp lại drill với dữ liệu quy mô lớn hơn (hàng nghìn booking) khi có traffic production thật, để xác nhận RTO không tăng đáng kể.
