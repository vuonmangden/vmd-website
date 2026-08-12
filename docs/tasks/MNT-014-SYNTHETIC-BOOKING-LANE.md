# MNT-014 — Synthetic Booking Lane Authorization

## 1. Thông tin task

- **Task ID:** `MNT-014`
- **Trạng thái:** Done
- **Mục tiêu:** Ghi nhận phê duyệt của Chủ dự án để phát triển RMS → Booking → Payment sandbox bằng dữ liệu giả lập, trong khi các quyết định vận hành nhạy cảm tiếp tục chờ dữ liệu thật.

## 2. Quyết định được duyệt — 2026-08-12

Chủ dự án phê duyệt: “mở lane phát triển bằng dữ liệu mẫu cho RMS → Booking → Payment sandbox và đồng thời giữ các thông số nhạy cảm ở trạng thái cấu hình”.

- Phạm vi được mở: schema, API, UI nội bộ, test, local/development/staging demo và payment sandbox.
- Dữ liệu mẫu bắt buộc có nhãn `SYNTHETIC`/`DEMO`, deterministic và chỉ được seed khi non-production opt-in theo `TST-001`/`DEC-004`.
- Không được dùng data mẫu làm nội dung public, giá mở bán, cọc, chính sách thương mại, accounting evidence hoặc production config.
- `PRE-001` đến `PRE-005` vẫn Blocked; `BLK-001` không đóng. Giá/cọc/phụ thu, hold TTL production, hủy/đổi/hoàn tiền, SePay/bank secret tiếp tục là cấu hình chờ Chủ dự án chốt.
- Production vẫn fail-closed đến `REL-001` và các PRE thật tương ứng.

## 3. Thứ tự thực hiện

1. RMS-001, RMS-002, RMS-003/RMS-004, RMS-005/RMS-006.
2. BKG-002 đến BKG-005, sau đó UI/lookup/admin khi dependency đạt.
3. Payment sandbox chỉ sau Booking core; không tích hợp tài khoản hoặc webhook SePay production.

## 4. Kết quả

- Tạo task spec `RMS-001.md` với guard synthetic/staging-only.
- Mở RMS-001 ở trạng thái `Ready (SYNTHETIC_ONLY)`; các task sau vẫn theo dependency của chúng.
