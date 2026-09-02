# BBQ-007 — Production BBQ, Menu and Daily Quota Cutover

## 1. Thông tin task

- **Task ID:** `BBQ-007`
- **Trạng thái:** In progress (Codex, 2026-09-02)
- **Branch:** `codex/bbq-007-production-cutover`
- **Dependency:** `MNT-015`, `BBQ-006`, `PRE-004`

## 2. Nguồn yêu cầu chuẩn

- `docs/09_MILESTONE_0_INPUT_PACK.md` §3A/§7 (snapshot chủ dự án 2026-09-01) là nguồn vận hành ưu tiên.
- Các dữ liệu/giả định cũ của `BBQ-001`–`BBQ-005` (5 khu/29 bàn, cọc 150.000đ, hold 120 phút, hai ca cố định) bị thay thế ở phạm vi cutover này.

## 3. Mục tiêu

Đưa BBQ từ lane synthetic/sandbox sang luồng production-safe: catalog vận hành thật, menu từ ảnh ngày 2026-09-01, không thu cọc, giữ chỗ 30 phút, quota 120 khách/ngày và lễ tân xác nhận booking online.

## 4. Nghiệp vụ chốt

1. Ba khu `SAN-DO`, `TRONG-NHA`, `NGOAI-SAN`; mỗi khu 10 bàn `...-01` đến `...-10`, tất cả ACTIVE.
2. Mỗi bàn nhận 2–4 khách, không ghép bàn tự động. Nhóm 5–20 khách được phép gửi booking online nhưng không được gán bàn trước; lễ tân sắp xếp khi khách đến.
3. Toàn hệ thống có quota 120 khách cho từng ngày vận hành. Booking online trạng thái chờ xác nhận vẫn chiếm quota; chỉ `CANCELLED`/`EXPIRED` giải phóng quota. Kiểm tra quota phải atomic trong PostgreSQL transaction.
4. Online booking 2–20 khách đều tạo `PENDING_CONFIRMATION`, không phát hành payment intent, QR hay hold tài nguyên bàn. Lễ tân xác nhận trước khi nhận khách; với nhóm 2–4 có thể gán bàn trong bước xác nhận, với nhóm 5–20 gán thủ công tại chỗ.
5. Phục vụ từ 10:30 đến last order 21:30; không cam kết thời lượng lượt hoặc tự suy luận giờ kết thúc. Thời gian dọn bàn 10 phút là thông tin vận hành, không phải giả định để tự gán slot cho booking online.
6. Không thu cọc; không phát sinh `PaymentIntent` cho BBQ ở luồng này. Chỉ `BBQ_HOLD_MINUTES=30` được dùng cho thao tác giữ bàn do nhân sự tạo sau này, không cho public request.
7. Menu giá theo bốn ảnh chủ dự án cung cấp 2026-09-01, đã gồm VAT. Menu/đổi món tiếp tục cấu hình CMS; booking snapshot đúng các món đã chọn.

## 5. Phạm vi triển khai

- Migration/schema/seed chuyển catalog BBQ, service hours, booking state và quota persistence cần thiết; forward-only, không xóa lịch sử.
- Public availability/checkout và admin reservation flow; OpenAPI, rate-limit, idempotency, status history, audit/outbox.
- Public web `/bbq` và `/dat-bbq`: không hiển thị cọc/QR, diễn đạt rõ “lễ tân xác nhận”, có loading/empty/error và mobile QA.
- Nhập menu đã nhận, không thêm giá/sản phẩm ngoài ảnh nguồn.

## 6. Ngoài phạm vi

- SePay thật/QR/tài khoản nhận tiền (`PAY-007`).
- UI admin vận hành hoàn chỉnh (`ADM-003`); API admin phải đủ để lễ tân xác nhận/gán bàn.
- Thay đổi menu qua CMS nâng cao; hủy/đổi món chi tiết sau booking, notification provider production.

## 7. Acceptance criteria và kiểm thử

- Không còn cọc/QR/hold public 120 phút hoặc dữ liệu 5 khu/29 bàn trong catalog production.
- Concurrent requests không thể vượt 120 khách/ngày; replay idempotency an toàn, changed payload trả 409.
- 2–4 và 5–20 tạo được request đúng trạng thái; 21+ bị chặn; `CANCELLED`/`EXPIRED` mới giải phóng quota.
- Không tạo payment intent/resource hold/table assignment khi public request; staff assignment không vi phạm sức chứa/exclusion constraint.
- Menu public không lộ ghi chú nội bộ và toàn bộ giá/đơn vị import được đối chiếu test/seed.
- Lint, typecheck, targeted unit/integration, full test/build/Prisma/Compose/audit, visual desktop/mobile và hosted CI đạt trước merge.

## 8. Bảo mật và rủi ro

- Backend là nguồn sự thật của guest count/quota/menu/status; không tin table, price hoặc status từ client.
- Không log PII/payment secret; mọi confirm/cancel/assign phải authorization + audit.
- Không chạy migration/seed production trong task. SePay thật vẫn fail-closed đến `PAY-007`.
