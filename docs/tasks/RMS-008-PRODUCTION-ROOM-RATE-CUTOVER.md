# RMS-008 — Production Room and Rate Cutover

## 1. Thông tin task

- **Task ID:** `RMS-008`
- **Trạng thái:** In progress (Codex, 2026-09-01)
- **Mục tiêu:** Thay dữ liệu phòng/giá public synthetic bằng catalog production đã được chủ dự án duyệt, theo cơ chế seed versioned và idempotent.
- **Branch:** `codex/rms-008-production-room-rate-cutover`
- **Phụ thuộc:** `MNT-015`, `RMS-007`, `PRE-001`, `PRE-002`, `PRE-003`.

## 2. Nguồn dữ liệu chuẩn

- `docs/09_MILESTONE_0_INPUT_PACK.md` §3A, xác nhận trực tiếp ngày 2026-09-01.
- Bảng giá phòng do chủ dự án cung cấp ngày 2026-09-01.
- Khi dữ liệu lịch sử mâu thuẫn với snapshot §3A, dùng snapshot §3A.

## 3. Phạm vi

- Tạo catalog versioned, deterministic và idempotent cho tám hạng/phòng vật lý:
  - `201`–`207`: tầng 2, `ACTIVE`, mỗi hạng có đúng một phòng vật lý.
  - `301`: tầng 2, `INACTIVE`, không tham gia tìm phòng/quote/booking online.
- Tên hiển thị 201–207 giữ đúng bảng giá; mã kỹ thuật và slug chỉ là định danh deterministic nội bộ.
- Sức chứa chuẩn/tối đa: 201, 203–207 là 2/3; 202 là 4/5. Mỗi hạng tối đa một đệm, một đệm tăng sức chứa một khách, giá 200.000 VND.
- Tiện nghi, cấu hình giường, mô tả và khu vực để trống; không tự đoán.
- Tạo rate rule production từ 2026-09-01:
  - Chủ Nhật–Thứ Năm: mức ngày thường.
  - Thứ Sáu–Thứ Bảy: mức cuối tuần.
  - Mức Lễ/Tết/cao điểm được lưu trong metadata catalog để CMS tạo rule có khoảng ngày cụ thể; không tự tạo khoảng ngày Lễ/Tết.
- Giá lưu bằng số nguyên VND và được công bố là chưa gồm VAT.
- Sửa Price Engine để phụ thu khách lớn hơn sức chứa chuẩn, không mặc định tính phụ thu từ người lớn thứ hai.
- Public room list/detail/availability/quote chuyển nhãn từ synthetic sang production catalog. Endpoint không lộ room ID, room code, rate-rule ID hoặc tồn kho vật lý.
- Giữ nguyên fixture synthetic, tên/guard và khả năng dùng cho local/test/demo nội bộ.

## 4. Quy tắc seed và cutover

- Catalog có version rõ ràng và marker trong `app_settings`; toàn bộ lần áp dụng đầu tiên chạy trong một transaction.
- Mỗi room type, room và rate rule dùng định danh deterministic; không tạo bản sao khi seed lại.
- Seed cùng version là no-op để không ghi đè thay đổi vận hành/CMS sau cutover.
- Marker version khác không được tự downgrade hoặc ghi đè; phải fail closed để yêu cầu một task migration catalog mới.
- Không xóa dữ liệu hoặc rename fixture synthetic.
- Rate Lễ/Tết/cao điểm chỉ được kích hoạt khi vận hành cung cấp khoảng ngày; rule ngày cụ thể phải có priority cao hơn rule ngày trong tuần.

## 5. Ngoài phạm vi

- Ảnh phòng, tiện nghi, cấu hình giường, mô tả marketing và giá Dorm 301.
- UI quản trị/CMS hoàn chỉnh; thuộc `ADM-003`.
- Checkout production, chọn đệm rõ ràng, cọc 50%/100%, hold 30 phút và voucher; thuộc `BKG-010`.
- Chọn hoặc tính VAT/hóa đơn; task này chỉ trả metadata `pricesIncludeVat=false`.
- Cấu hình khoảng ngày Lễ/Tết/cao điểm cụ thể khi chưa được vận hành cung cấp.
- SePay, production secret, deploy hoặc thao tác database production.

## 6. Acceptance criteria

- Catalog có đúng 7 hạng/phòng active 201–207 và một hạng/phòng 301 inactive; tất cả ở tầng 2.
- 201–207 có amenities/bed configuration rỗng và đúng sức chứa 3/5 khách đã duyệt.
- Weekday/weekend rate từ 2026-09-01 khớp đủ 14 giá; mức holiday khớp đủ 7 giá trong metadata để CMS tạo date-range rule.
- Public API trả `isSandbox=false`, `pricesIncludeVat=false`, chính sách đệm 1 × 200.000 VND và không trả dữ liệu nội bộ.
- Price Engine không tính phụ thu trong sức chứa chuẩn; chỉ áp dụng 200.000 VND cho người lớn vượt sức chứa chuẩn trong phạm vi tối đa.
- Seed chạy hai lần không tạo trùng và không ghi đè sau khi version đã áp dụng; fixture synthetic vẫn DRAFT/INACTIVE và được guard như trước.
- Không có secret, credential, PII thật, dependency hoặc thay đổi kiến trúc.

## 7. Tests và Definition of Done

- Unit test catalog: tên, mã, trạng thái, tầng, capacity, 14 rate, 7 holiday metadata, VAT và đệm.
- Unit test seed: transaction, deterministic upsert, same-version no-op, version conflict fail closed, không đụng synthetic fixture.
- Price Engine/API tests: included capacity, extra adult, weekday/weekend priority, public-safe fields và production labels.
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm ci:prisma`, Prisma schema validation, Compose config và `git diff --check`.
- PR có tracker/evidence; hosted CI đạt trước merge.

## 8. Security và rủi ro

- Không thao tác production database trong task này; seed chỉ được chạy production sau approval của `REL-001` và backup/rollback gate.
- Public API tiếp tục không trả ID nội bộ, room code hoặc rule IDs.
- Phụ thu đệm tự chọn cho khách vẫn phải được `BKG-010` lưu thành booking add-on/snapshot; RMS-008 chỉ đưa dữ liệu giá/capacity production và sửa baseline tính khách thêm.
- Không kích hoạt holiday rule toàn dải ngày; khoảng ngày luôn là input vận hành cụ thể.
