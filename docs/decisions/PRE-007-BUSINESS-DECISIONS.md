# PRE-007 — Quyết định nghiệp vụ Phase 1

Ngày chốt: 2026-08-13
Owner: Chủ dự án + Claude

---

## 1. BKG-006 — Checkout

### Các bước checkout

1. **Chọn phòng/dịch vụ** — xem availability, chọn ngày, chọn phòng
2. **Thông tin khách** — điền form + yêu cầu đặc biệt
3. **Xác nhận & thanh toán** — review tổng tiền, QR chuyển khoản SePay
4. **Xác nhận đặt phòng** — hiển thị mã booking, gửi email xác nhận

### Thông tin bắt buộc

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Họ tên | Bắt buộc | `full_name` varchar(150) |
| Số điện thoại | Bắt buộc | Normalize E.164 VN, dùng liên hệ + dedup |
| Email | Khuyến nghị, không bắt buộc | Nếu có → gửi xác nhận. Nếu không → "Lưu mã booking để tra cứu" |
| Số khách (người lớn/trẻ em) | Bắt buộc | Kiểm tra sức chứa phòng |
| Ghi chú / yêu cầu đặc biệt | Tùy chọn | `special_requests` |
| Giờ đến dự kiến | Tùy chọn | `expected_arrival_time` |

Không yêu cầu CCCD/hộ chiếu khi đặt online.

### Room + BBQ cùng đơn

**Không.** Tách riêng. State machine và availability logic khác nhau (phòng theo đêm, BBQ theo slot/giờ). UI cross-sell sau khi đặt phòng xong: gợi ý "Đặt thêm BBQ?".

### Sau khi tạo booking

Chuyển thẳng trang thanh toán QR — không cần bước trung gian. Giảm drop-off, khách đã xác nhận thông tin ở bước 3.

```
Bước 3: "Xác nhận đặt phòng" (click)
  → Tạo booking (DRAFT → PENDING_PAYMENT)
  → Tạo payment intent
  → Redirect trang QR thanh toán (PAY-006)
  → Hiển thị QR + nội dung CK + countdown hạn 24h
```

---

## 2. BKG-007 — Tra cứu booking

### Tra cứu bằng

Mã booking + Số điện thoại (bắt buộc cả hai, chống IDOR). Nhập sai 5 lần → khóa IP 15 phút. Normalize SĐT trước khi so sánh. Không tiết lộ "mã booking tồn tại nhưng SĐT sai" → chỉ báo "Không tìm thấy".

### Hiển thị

- Mã booking, trạng thái (badge màu), loại phòng + số lượng
- Ngày nhận/trả, số đêm, số khách
- Tổng tiền / đã thanh toán / còn lại (VND)
- Hạn thanh toán (chỉ khi PENDING_PAYMENT)
- Yêu cầu đặc biệt, ngày đặt
- Mask SĐT (`****4567`) và email (`ngu***@example.com`)
- Không hiển thị: lịch sử trạng thái, STK ngân hàng

### Cho phép thao tác

| Thao tác | Điều kiện | Ghi chú |
|---|---|---|
| Xem QR thanh toán | PENDING_PAYMENT, chưa hết hạn | Hiện lại QR + nội dung CK |
| Yêu cầu hủy | CONFIRMED, trước check-in | Tạo request PENDING_REVIEW, admin duyệt |
| Yêu cầu đổi ngày | CONFIRMED, trước check-in | Tạo request PENDING_REVIEW, admin duyệt |
| Tải xác nhận | CONFIRMED / PAID | HTML in được (`window.print`), Phase 2 mới cần PDF |
| Liên hệ hỗ trợ | Mọi trạng thái | Hotline / Zalo / Email / Facebook |

Không cho phép: tự xác nhận đã thanh toán, tự hủy trực tiếp, sửa thông tin khách.

### Kênh liên hệ hỗ trợ

```
Hotline:  1900 9085
Email:    vuonmangden.com@gmail.com
Zalo:     link Zalo OA
Facebook: link Facebook page
```

Cấu hình qua `app_settings` (CMS-001), admin đổi được sau.

### Yêu cầu hủy/đổi ngày

Tạo request trạng thái `PENDING_REVIEW`. Quy trình xử lý:

| Bước | Vai trò | Thao tác |
|---|---|---|
| Tiếp nhận | Receptionist | Xem request, kiểm tra chính sách, ghi chú |
| Duyệt/từ chối | Manager | Quyết định cuối cùng, xác nhận hoàn tiền nếu có |

```
Khách gửi yêu cầu hủy
  → Tạo cancellation_request (PENDING_REVIEW)
  → Notification cho Receptionist + Manager
  → Receptionist xem, ghi chú
  → Manager duyệt → Booking CANCELLED
  → Hoàn tiền thủ công (Phase 1)
  → Notification cho khách
```

---

## 3. CMS-001 — Site Settings

### Thông tin admin được sửa

| Setting | Kiểu | Ghi chú |
|---|---|---|
| Tên resort | text | Header, footer, email |
| Slogan / tagline | text | SEO, hero section |
| Logo | media | Header, favicon, email |
| Số điện thoại liên hệ | text | Header, footer, contact |
| Email liên hệ | text | Footer, contact form |
| Địa chỉ | text | Footer, Google Maps |
| Google Maps embed/link | text | Trang liên hệ |
| Facebook URL | text | Footer, social links |
| Zalo OA link | text | Footer, floating button |
| Giờ làm việc | text | Footer, contact |
| Chính sách chung | rich text | Trang riêng |
| Thông báo banner | text + toggle | Top bar, bật/tắt |
| Timezone | select | Đã seed: Asia/Ho_Chi_Minh |
| Currency | select | Đã seed: VND |

### Vai trò được sửa

| Vai trò | Quyền | Ghi chú |
|---|---|---|
| Super Admin | Đọc + Sửa tất cả | Toàn quyền |
| Manager | Đọc + Sửa (trừ timezone, currency) | Cập nhật thông tin, banner |
| Receptionist | Chỉ đọc | Xem thông tin, không sửa |
| Accountant | Không truy cập | Không liên quan |

### Cần audit

**Có.** Ghi actor (staff UUID + role), action (`setting.updated`), resource (`app_settings.<key>`), before/after data, IP, correlation ID vào bảng `audit_logs`. Bảng đã có sẵn từ FND-005.

---

## 4. PAY-001 — Payment Intent

### Dùng sandbox

**Có.** SePay Test Mode cho staging. Production chuyển sang live key trước go-live.

### Hạn thanh toán mẫu

| Loại | Thời hạn | Ghi chú |
|---|---|---|
| Đặt phòng online | 24 giờ | Đủ thời gian CK, không giữ phòng quá lâu |
| Đặt BBQ online | 12 giờ | BBQ slot ít, cần release nhanh |
| Cọc bổ sung | 48 giờ | Cho thêm thời gian |

Cấu hình qua `app_settings`, không hardcode:

```
booking.payment_ttl_hours = 24
bbq.payment_ttl_hours = 12
```

### Khi hết hạn

```
1. Payment intent → EXPIRED
2. Booking → EXPIRED (PENDING_PAYMENT → EXPIRED)
3. Room hold → giải phóng occupancy (trong cùng transaction)
4. Notification → gửi email "Đơn đặt phòng đã hết hạn"
5. Audit log → ghi lý do "payment_expired"
```

Không tự động hoàn tiền nếu đã nhận một phần → tạo reconciliation case cho admin.

### Nội dung chuyển khoản mẫu

Format: `VMD [TYPE][YYMMDD][RANDOM_4]`

| Loại | Ví dụ | Ghi chú |
|---|---|---|
| Đặt phòng | `VMD BK240813A1` | BK + ngày + mã ngắn |
| Đặt BBQ | `VMD BBQ240813B2` | BBQ + ngày + mã ngắn |

Quy tắc:

- Tối đa 25 ký tự (giới hạn nội dung CK ngân hàng VN)
- Chỉ chữ HOA + số, không dấu
- Unique — SePay dùng nội dung CK để match webhook với payment intent

---

## 5. PAY-002 / PAY-003 — SePay Webhook

### Xác thực webhook

- Header: `Authorization: Apikey <SEPAY_API_KEY>`
- So sánh API key trực tiếp, không dùng HMAC signature
- Gợi ý bổ sung: allowlist IP SePay khi production

### Mẫu JSON webhook

```json
{
  "id": 123456,
  "gateway": "Vietcombank",
  "transactionDate": "2026-08-13 14:30:00",
  "accountNumber": "0123456789",
  "subAccount": null,
  "transferType": "in",
  "transferAmount": 2500000,
  "accumulated": 5000000,
  "code": "VMD BK240813A1",
  "content": "VMD BK240813A1",
  "referenceCode": "FT26081300001",
  "description": "NGUYEN VAN A chuyen tien"
}
```

### Quy tắc xác nhận thanh toán

Chỉ auto-confirm khi **cả hai điều kiện**:

1. `transferAmount >= amountDue`
2. `content` hoặc `code` khớp transfer content của payment intent

Khớp = normalize bỏ khoảng trắng thừa, uppercase, so sánh chứa mã booking.

### Thanh toán bất thường

| Trường hợp | Xử lý |
|---|---|
| Đúng tiền + đúng nội dung | Auto confirm |
| Thừa tiền + đúng nội dung | Reconciliation case |
| Thiếu tiền + đúng nội dung | Reconciliation case |
| Đúng tiền + sai nội dung | Reconciliation case |
| Sai cả hai | Reconciliation case |

Tất cả trường hợp không happy path đều tạo reconciliation, không tự xác nhận.

---

## 6. PAY-006 — Trang trạng thái thanh toán

### Polling interval

- **10 giây** — SePay webhook thường về trong 30s-2 phút
- Sau 5 phút không thay đổi → giảm xuống 30 giây (adaptive polling)
- Endpoint: `GET /api/payments/:id/status` — response nhẹ, chỉ trả status

### Khi hết hạn

Hiển thị **"Liên hệ hỗ trợ"** — không cho "Tạo lại thanh toán" (Phase 1).

```
⏰ Đơn đặt phòng đã hết hạn

Vui lòng liên hệ để đặt lại:
📞 1900 9085
💬 Zalo: link Zalo OA

[Về trang chủ]
```

### Khi có reconciliation

Thông báo chung, không chi tiết nội bộ:

```
🔄 Thanh toán đang được xử lý

Chúng tôi đã nhận được giao dịch và đang xác minh.
Vui lòng chờ trong 24 giờ.

Nếu cần hỗ trợ: 📞 1900 9085
```

---

## 7. Hạ tầng & Provider

### Supabase

- Staging project: `atefkvykvwgtuaiscxnm` (ap-southeast-1)
- Production project: tạo riêng trước go-live (REL-001)
- Không dùng chung staging/production (Security Baseline §2)

### Redis

- Provider: Upstash
- Staging: `fluent-newt-172496.upstash.io:6379` (TLS enabled)

### Hosting

- API + Worker: Railway
- Staging domain: `staging.vuonmangden.vn`
- Admin production domain: chưa chốt (gợi ý: `admin.vuonmangden.vn`)

### CORS

```
Staging:    https://staging.vuonmangden.vn
Production: https://vuonmangden.vn,https://www.vuonmangden.vn,https://admin.vuonmangden.vn
```

### Auth callback

```
Staging:    https://staging.vuonmangden.vn/auth/callback
Production: https://admin.vuonmangden.vn/auth/callback
```

### Email provider

- Provider: Resend
- From: `Vườn Măng Đen <noreply@vuonmangden.vn>`
- Reply-to: `info@vuonmangden.vn`
- Staging: Resend test mode hoặc Mailpit local
- Domain verify: SPF/DKIM/DMARC — chủ dự án thực hiện

### Secret store

| Environment | Nơi lưu |
|---|---|
| Local | `.env` (gitignored) |
| Staging | Railway Variables |
| Production | Railway Variables |
| CI | GitHub Secrets |
| Quản lý | Chủ dự án |
