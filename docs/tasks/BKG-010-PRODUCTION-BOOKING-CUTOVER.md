# BKG-010 — Production Booking Cutover and Date Change

## 1. Thông tin task

- **Task ID:** `BKG-010`
- **Trạng thái:** Review (Codex, 2026-09-02)
- **Branch:** `codex/bkg-010-production-booking-cutover`
- **Phụ thuộc:** `MNT-015`, `RMS-008`, `BKG-009`.
- **Mục tiêu:** Chuyển booking phòng public khỏi lane synthetic, áp dụng chính sách cọc/hold/đệm đã duyệt và thực thi đổi ngày một lần bằng transaction an toàn.

## 2. Nguồn yêu cầu chuẩn

- `docs/09_MILESTONE_0_INPUT_PACK.md` §3A, snapshot chủ dự án ngày 2026-09-01.
- `docs/tasks/RMS-008-PRODUCTION-ROOM-RATE-CUTOVER.md`.
- `docs/tasks/BKG-009.md` và chính sách hiệu lực từ 2026-08-25.
- Khi các section lịch sử ghi hold 120 phút, VAT/giá/phụ thu cũ hoặc synthetic-only thì §3A và task này được ưu tiên.

## 3. Phạm vi checkout production

- Public checkout tạo mã `VMD-BK-*`, nguồn `DIRECT`, event/provider-neutral và snapshot giá production; không dùng mã `SYN-*`, nguồn `SYNTHETIC`, marker `sandbox` hoặc nội dung “demo”.
- Backend kiểm tra lại ngày ở, sức chứa, phòng active, block, occupancy và giá trong cùng luồng tạo booking; không trả room ID/code/rate-rule ID công khai.
- Ngày nhận phòng phải là ngày vận hành hiện tại hoặc tương lai; ngày trả phòng phải sau ngày nhận phòng.
- Bắt buộc khách đồng ý chính sách đặt phòng và xử lý dữ liệu. Email vẫn không bắt buộc; điện thoại Việt Nam được chuẩn hóa server-side.
- `Idempotency-Key` bắt buộc: cùng key/cùng payload trả kết quả cũ; cùng key/khác payload trả `409 IDEMPOTENCY_CONFLICT`.
- Hold phòng và payment intent của checkout cùng hết hạn sau 30 phút; payment intent không được kéo dài occupancy vượt hold.
- Cọc:
  - 50% tổng booking cho ngày thường/cuối tuần.
  - 100% nếu tạo booking trong vòng 3 ngày trước check-in hoặc có ít nhất một đêm dùng rate `HOLIDAY`.
  - Tiền cọc làm tròn xuống nghìn đồng, không vượt tổng booking, và được snapshot trên booking.
- Room rate rule có phân loại server-side `STANDARD`/`HOLIDAY`; CMS/API phải khai báo rõ khi tạo khoảng ngày Lễ/Tết/cao điểm. Không suy luận từ tên rule hoặc dữ liệu frontend.
- Đệm: khách chọn rõ 0 hoặc 1. Nếu số người lớn vượt sức chứa chuẩn thì bắt buộc 1 đệm; khách trong sức chứa chuẩn vẫn có thể chọn 1 đệm. Giá đệm 200.000 VND/đêm theo rate snapshot RMS-008, tối đa một đệm và tăng sức chứa một khách.
- Booking/booking-room lưu đủ `depositRequiredAmount`, chính sách cọc, lựa chọn đệm và snapshot từng đêm để rule mới không làm thay đổi booking cũ.

## 4. Phạm vi đổi ngày

- Khách chỉ tạo yêu cầu; chỉ Manager/Super Admin được duyệt. Lần thứ hai trả lỗi ổn định và hướng dẫn liên hệ Homestay để xử lý thủ công.
- Khi duyệt `DATE_CHANGE`, staff bắt buộc chọn bảng chính sách `STANDARD` hoặc `HOLIDAY`; backend kiểm tra cửa sổ đổi ngày bằng `CancellationPolicyService`.
- Chỉ booking `CONFIRMED`, một phòng, chưa đổi lần nào mới được thực thi tự động. Trường hợp ngoài phạm vi được từ chối an toàn để lễ tân xử lý.
- Ngày mới phải hợp lệ, còn phòng cùng hạng và nằm trong 60 ngày từ check-in ban đầu. Backend tính lại giá bằng rate production và giữ nguyên lựa chọn đệm.
- Trong một database transaction:
  1. claim yêu cầu để không thể duyệt hai lần;
  2. kiểm tra booking/policy/quota đổi ngày;
  3. cấp lại phòng và occupancy bằng unique constraint;
  4. tính/snapshot giá mới;
  5. cập nhật ngày, phòng, tổng tiền phải thu và `dateChangeCount=1`;
  6. ghi hai history `CONFIRMED → MODIFIED → CONFIRMED`;
  7. vô hiệu reminder cũ, ghi audit và outbox `booking.modified`;
  8. hoàn tất guest request cùng dữ liệu trước/sau và phần chênh lệch.
- Giá mới cao hơn: booking tăng đúng phần chênh lệch và lưu `additionalAmountDue`; giá thấp hơn: không giảm tổng tiền đã cam kết và không tạo refund.
- BKG-010 chỉ ghi nhận khoản cần thu thêm; việc phát hành/đối soát payment intent bổ sung bằng SePay production thuộc `PAY-007`.
- Khi duyệt hủy sau một lần đổi, cancellation quote phải nhận `dateChangeUsed=true`, nên không còn quyền hoàn/hủy tiêu chuẩn.

## 5. Migration

- Forward-only migration, không sửa migration cũ.
- Thêm dữ liệu tối thiểu:
  - `room_rate_rules.rate_type` (`STANDARD`/`HOLIDAY`, mặc định `STANDARD`);
  - booking: cọc, loại cọc, ngày ban đầu, số lượt đổi;
  - booking room: số đệm;
  - guest request: tổng cũ, giá tính lại, tổng phải thu sau đổi và chênh lệch cần thu.
- Thêm CHECK constraint cho số tiền không âm, số đệm 0–1, số lượt đổi 0–1 và vocabulary được phép.
- Không drop/rename dữ liệu, không reset database và không chạy production migration trong task này.

## 6. Ngoài phạm vi

- SePay/account/QR production, supplemental payment intent và secret thật (`PAY-007`).
- UI quản trị booking/CMS hoàn chỉnh (`ADM-003`).
- BBQ (`BBQ-007`), voucher, VAT/hóa đơn, ảnh/tiện nghi phòng.
- Tự động hoàn tiền hoặc chuyển tiền.
- Tự động xử lý booking nhiều phòng hoặc lần đổi thứ hai.

## 7. Acceptance criteria

- Public booking không còn marker synthetic và tạo occupancy/hold 30 phút an toàn dưới concurrency.
- Payment intent checkout hết hạn đúng hold, số tiền bằng cọc 50%/100% đã snapshot.
- Không thể replay một idempotency key với payload khác.
- Đệm 0/1 được validate, tính đúng theo đêm và không tính hai lần cho khách vượt sức chứa chuẩn.
- Duyệt đổi ngày thành công cập nhật atomically ngày, phòng, occupancy, snapshot giá, tổng tiền, history, request, audit, outbox và số lượt đổi.
- Conflict ngày mới rollback toàn bộ, giữ nguyên ngày/phòng/occupancy/giá cũ.
- Lần đổi thứ hai, ngoài cửa sổ chính sách, sai role hoặc booking sai trạng thái đều fail closed.
- Hủy sau khi đổi áp dụng `DATE_CHANGE_ALREADY_USED` và refund bằng 0.
- Public web bỏ nhãn demo/sandbox, có consent, lựa chọn đệm, loading/error và không index checkout.

## 8. Tests và Definition of Done

- Unit: hold config, deposit 50%/100%/rounding, holiday classification, đệm, idempotency conflict, date-change policy và price difference.
- Transaction/integration: occupancy conflict, expiry release, concurrent approval, successful reschedule, rollback on new-date conflict, stale reminders, cancellation after reschedule.
- API/web: validation, safe response/OpenAPI, mobile checkout, loading/error/consent.
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm ci:prisma`, Prisma validate/migration check, Compose config, audit dependency và `git diff --check`.
- Hosted CI đạt; tracker/evidence cập nhật trước khi merge.

## 9. Bảo mật và rủi ro

- Không tin tổng tiền, deposit, holiday flag, room ID hoặc quyền do frontend gửi lên.
- Mọi thay đổi booking/date/giá phải có audit cùng transaction; public response không lộ ID vật lý hoặc rate IDs.
- Unique occupancy vẫn là lớp chống double booking cuối; Redis/hold không thay thế PostgreSQL.
- Không dùng secret hoặc dữ liệu khách thật trong test; không thao tác production trong BKG-010.

## 10. Evidence triển khai

- Migration `20260901100000_production_booking_cutover` đã áp dụng thành công trên PostgreSQL local verification; Prisma validate và `pnpm ci:prisma` đạt.
- Full gate local với Node 24.19.0/pnpm 11.9.0 đạt: lint, typecheck, test (API 456/456, Web 52/52, Worker 72/72 và scripts 26 pass/1 skip), build.
- Visual QA checkout desktop và viewport 390px: 3 bước, đệm thêm, hai consent, loading/error state; không tràn ngang và không có console error.
- `pnpm audit --prod --audit-level high` đạt sau khi khóa transitive `mysql2` ở `3.22.0` để xử lý GHSA-3f6p-5ww8-9rcr; còn 3 cảnh báo mức moderate ngoài ngưỡng release gate.
- Hosted CI rerun cho PR #91 là điều kiện còn lại trước merge. SePay QR/tài khoản production và khoản thanh toán bổ sung vẫn thuộc `PAY-007`, không được ngầm coi là đã production-ready ở task này.
