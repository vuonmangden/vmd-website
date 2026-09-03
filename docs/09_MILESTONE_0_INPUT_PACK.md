# Milestone 0 Input Pack — Vườn Măng Đen Phase 1

## 1. Mục đích

Tài liệu này là nguồn tập trung để chủ dự án chốt toàn bộ dữ liệu vận hành đang tạo `BLK-001`. Codex không được dùng giá trị trong tài liệu này cho production cho đến khi từng nhóm có `Trạng thái = Đã duyệt`, người duyệt và ngày duyệt.

Không ghi password, API key, access token, private key, OTP hoặc connection string vào repository. Với secret, chỉ ghi tên secret/reference và nơi lưu an toàn.

### Chế độ dữ liệu giả lập trong giai đoạn setup

Theo phê duyệt của chủ dự án ngày 2026-08-09, khi PRE-001 đến PRE-008 chưa có dữ liệu thật được duyệt, Codex được phép tạo và sử dụng dữ liệu giả lập cho môi trường local, development, automated test và demo nội bộ.

Dữ liệu giả lập phải tuân thủ toàn bộ điều kiện sau:

- Được đánh dấu rõ là `SYNTHETIC`, `MOCK`, `DEMO` hoặc tương đương; không thể bị hiểu nhầm là dữ liệu vận hành thật.
- Không chứa PII thật, tài khoản ngân hàng thật, credential, secret, token hoặc identifier provider thật.
- Không được dùng làm cấu hình production, nội dung công khai, căn cứ kế toán, chính sách thương mại hoặc bằng chứng duyệt PRE.
- Giá, cọc, phụ thu, thời gian giữ chỗ, chính sách hủy/đổi/hoàn tiền, quyền và nội dung notification giả lập chỉ phục vụ kiểm thử; phải thay thế bằng dữ liệu đã duyệt trước production.
- Seed/fixture phải có cơ chế fail-closed hoặc guard môi trường để không chạy nhầm trên production.
- Khi chủ dự án cung cấp dữ liệu thật hoặc yêu cầu dừng giả lập, dữ liệu được duyệt mới trở thành nguồn chuẩn và thay thế dữ liệu giả tương ứng.

Quyết định này không chuyển PRE-001 đến PRE-008 sang `Đã duyệt`, không đóng `BLK-001` và không tự động mở production readiness cho các task phụ thuộc.

### Bổ sung phê duyệt synthetic booking lane — 2026-08-12

Chủ dự án cho phép phát triển RMS → Booking → Payment sandbox bằng dữ liệu mẫu. Giá, cọc, phụ thu, hold TTL production, hủy/đổi/hoàn tiền, cấu hình SePay/bank và mọi giá trị thương mại vẫn là cấu hình chờ dữ liệu thật; không được phát hành production hoặc dùng làm căn cứ vận hành.

## 2. Cách duyệt nhanh

1. Điền các ô `Cần chủ dự án cung cấp`.
2. Gắn owner chịu trách nhiệm vận hành.
3. Chuyển trạng thái từng nhóm từ `Chờ dữ liệu` sang `Đã duyệt`.
4. Ghi người duyệt và ngày duyệt.
5. Cập nhật task PRE tương ứng trong `docs/08_PROGRESS_TRACKER.md`.

Các trạng thái hợp lệ: `Chờ dữ liệu`, `Đang rà soát`, `Đã duyệt`, `Không áp dụng Phase 1`.

## 3. Thứ tự ưu tiên mở khóa phát triển

| Ưu tiên | Nhóm | Mở khóa |
|---|---|---|
| P0 | PRE-001, PRE-002, PRE-003, PRE-005 | Room, Rate, Availability và Booking Core |
| P0 | PRE-006 | IAM/RBAC và Admin |
| P1 | PRE-004 | BBQ Booking |
| P1 | PRE-007 | Payment, email, Zalo và deployment |
| P2 | PRE-008 | Public Website, SEO và content production |

## 3A. Snapshot vận hành ưu tiên hiện hành — 2026-09-01

Snapshot này do chủ dự án xác nhận trực tiếp ngày 2026-09-01 và **thay thế mọi giá trị cũ ở các phần lịch sử bên dưới khi có mâu thuẫn**. Các section PRE chi tiết tiếp tục được giữ để audit nguồn và lịch sử quyết định.

### PRE-001/PRE-002 — phòng

- Tiện nghi tạm để trống, cập nhật qua CMS sau.
- Phòng 201–207 ở tầng 2 và `ACTIVE`; Dorm 301 ở tầng 2, `INACTIVE`, chưa mở bán và chỉ hiển thị “Liên hệ”.
- Mỗi hạng phòng được kê tối đa 1 đệm; một đệm tính thêm 1 khách; phụ thu 200.000 VND/đệm.
- Sức chứa tối đa: phòng 201, 203–207 là 3 khách; phòng 202 là 5 khách. Dorm 301 chưa tham gia booking online.

### PRE-003 — giá và booking phòng

- Giá hiệu lực từ 2026-09-01; ngày thường là Chủ Nhật–Thứ Năm, cuối tuần là Thứ Sáu–Thứ Bảy.
- Giá phòng **chưa gồm VAT**.
- Giá ngày thường/cuối tuần/lễ lần lượt: 201 = 550.000/650.000/780.000; 202 = 800.000/900.000/1.080.000; 203 = 500.000/600.000/720.000; 204 = 550.000/650.000/780.000; 205 = 600.000/700.000/840.000; 206 = 700.000/800.000/960.000; 207 = 700.000/800.000/960.000 VND/đêm.
- Các đợt Lễ/Tết/cao điểm mới dùng mức giá lễ nói trên; khoảng ngày do vận hành cấu hình trong CMS.
- Cọc phòng: 50% ngày thường/cuối tuần; 100% nếu đặt trong vòng 3 ngày trước check-in hoặc vào Lễ/Tết/cao điểm.
- Hold thanh toán: 30 phút. Chưa áp dụng voucher; voucher cấu hình CMS sau.

### PRE-004 — BBQ

- Ba khu: `SAN-DO`, `TRONG-NHA`, `NGOAI-SAN`; mỗi khu 10 bàn, toàn bộ `ACTIVE`.
- Mã bàn: `<MA-KHU>-01` đến `<MA-KHU>-10`.
- Mỗi bàn 2–4 khách; nhóm 5–20 khách không được gán bàn trước, lễ tân sắp xếp khi khách đến.
- Quota toàn hệ thống: 120 khách/ngày. Nhóm 2–4 đặt online theo luồng thường; nhóm 5–20 tạo booking chờ lễ tân xác nhận. Booking chờ xác nhận vẫn chiếm quota đến khi bị từ chối hoặc hủy.
- Phục vụ từ 10:30; last order 21:30; không giới hạn cố định thời lượng lượt; dọn bàn 10 phút; giữ bàn khi khách đến muộn 30 phút.
- Không thu cọc giữ bàn. Thành phần/số người đề xuất của set và quyền đổi món cấu hình CMS sau; cho phép đổi món.
- Menu và giá theo bốn ảnh menu chủ dự án cung cấp ngày 2026-09-01; giá menu đã gồm VAT.

### PRE-005 — hủy, đổi và hoàn tiền

- Chính sách hiệu lực từ 2026-08-25 theo file `Chinh-sach-huy-hoan-VMD.docx` chủ dự án cung cấp ngày 2026-09-01.
- Mỗi booking được đổi lịch tự động tối đa 1 lần; lần thứ hai chuyển sang liên hệ Homestay để xử lý thủ công.
- Ngày Lễ/Tết/cao điểm được vận hành tạo theo từng khoảng ngày trong CMS.
- Không tự động hoàn tiền trong Phase 1; Manager phê duyệt và mọi thao tác phải có audit/lý do.

### PRE-007 — tích hợp production

- SePay và tài khoản ngân hàng đã có; identifier/credential chỉ cung cấp qua kênh an toàn khi cấu hình integration.
- Supabase production project riêng đã có; URL/ref/region/secret chỉ cấu hình trong `REL-001`, không ghi vào Git.
- Google Drive cá nhân 5 TB là phương án media do chủ dự án đề xuất, chưa được duyệt production trước khi đạt review quyền truy cập, signed URL tương đương, audit, backup và giới hạn API.

## 4. PRE-001 — Loại phòng

**Trạng thái:** Partial — nhận bảng giá khách hàng ngày 2026-08-17; còn thiếu cấu hình giường, sức chứa tối đa và tiện nghi chi tiết
**Owner:** Chủ dự án
**Nguồn:** `VMD_Bao_Gia_Phong_2026_Khach_Hang.docx`, hiệu lực từ 25/08/2026
**Ngày nhận:** 2026-08-17

Bảy hạng phòng, mỗi hạng hiện có đúng một phòng thực tế (xem §5):

| Mã loại | Tên hiển thị | Sức chứa chuẩn | Đặc điểm chính |
|---|---|---:|---|
| `DOUBLE_LAKE_WINDOW` | Double Lake Window | 2 | Cửa sổ nhìn hồ tiểu cảnh, không ban công |
| `FAMILY_LOFT_BALCONY` | Family Loft Balcony | 4 | 1 giường đôi + 2 giường đơn, ban công gác mái |
| `DOUBLE_CITY_VIEW` | Double City View | 2 | Hướng phố, không ban công |
| `DOUBLE_BALCONY` | Double Balcony | 2 | Ban công riêng |
| `GARDEN_VIEW` | Garden View | 2 | Hướng vườn, không ban công |
| `PREMIUM_GARDEN_VIEW` | Premium Garden View | 2 | Hướng vườn đẹp, vị trí ưu tiên |
| `PREMIUM_BALCONY_VIEW` | Premium Balcony View | 2 | Ban công rộng, hướng phố đẹp |

**Mã loại ở trên do Claude đề xuất, chưa được chủ dự án duyệt.** Tài liệu chỉ ghi tên tiếng Anh của hạng phòng.

Quy tắc trẻ em đã chốt (§6 nguồn):

- Dưới 6 tuổi: miễn phí khi ngủ chung giường với bố mẹ.
- 6–11 tuổi: phụ thu ăn sáng 50.000đ/trẻ nếu sử dụng.
- Từ 12 tuổi: tính như người lớn.

Giường phụ: chỉ bố trí khi diện tích phòng phù hợp và có xác nhận từ Homestay — nghĩa là **không tự động cho phép**, cần thao tác thủ công.

### Cập nhật 2026-08-19 — tiện nghi và hạng phòng thứ 8

- **Tiện nghi xác nhận đồng nhất cho cả 7 hạng 201–207:** điều hòa, TV, minibar. Wifi/nước nóng chưa được xác nhận riêng, giả định có sẵn theo tiêu chuẩn homestay nhưng cần chủ dự án xác nhận trước khi hiển thị công khai.
- **Hạng phòng thứ 8 phát sinh:** phòng `301` "Doom" (nhiều khả năng là "Dorm" — phòng tập thể), sức chứa 16, tầng áp mái, giá niêm yết "Liên hệ" thay vì số cố định. Đây là hạng **ngoài phạm vi 7 hạng đã phân tích trước đó** và không khớp mô hình Price Engine hiện tại (yêu cầu giá cố định dạng số nguyên). Quyết định tạm thời: **không đưa 301 vào luồng đặt phòng online ở Phase 1**, giữ ở dạng liên hệ trực tiếp cho tới khi có bảng giá cố định hoặc quy tắc định giá riêng.

### Sức chứa tối đa — chốt 2026-08-19

**Sức chứa tối đa = sức chứa chuẩn cho mọi hạng: 2 khách/phòng, riêng `202 Family Loft Balcony` là 4 khách.** Không có phòng nào bán vượt số này.

> ⚠️ Lưu ý kỹ thuật: điều này khiến 2 dòng phụ thu "khách người lớn thêm" trong bảng giá (250.000đ/300.000đ người/đêm, điều kiện "vượt sức chứa chuẩn") **không bao giờ áp dụng được** — sức chứa tối đa trùng sức chứa chuẩn nên không có chỗ cho khách vượt. Không tự xoá 2 dòng này khỏi Price Engine (giữ để tương thích ngược nếu chủ dự án đổi ý), nhưng sẽ không có booking nào kích hoạt được mức phụ thu đó với dữ liệu hiện tại. Chủ dự án nên xác nhận đây đúng là chủ định (không bán thêm giường phụ) hoặc sửa lại một trong hai con số.

### Còn thiếu cho PRE-001

1. Cấu hình giường của 6 hạng còn lại trong 201–207 (chỉ `Family Loft Balcony`/202 được mô tả). **Đính chính 2026-08-23**: trước đó Claude báo nhầm với chủ dự án là hệ thống "chưa có trường lưu cấu hình giường" — thực ra cột `bed_configuration` đã có sẵn từ `RMS-001`, admin đã sửa được ngay qua API `room-types` hiện có (không cần code/migration mới). Khoảng trống thật duy nhất còn lại là **dữ liệu**: chủ dự án cung cấp mô tả giường của 6 hạng còn lại là nhập được ngay.
2. Xác nhận wifi/nước nóng có ở tất cả các phòng không.
3. Xác nhận cả 7 hạng 201–207 đều mở bán Phase 1. Phòng 301: **chốt 2026-08-19** — xử lý thủ công (liên hệ trực tiếp) tạm thời, giữ ngoài Price Engine/luồng đặt online; chủ dự án sẽ báo lại khi chốt cơ chế giá riêng để triển khai.
4. Duyệt mã loại phòng, hoặc cung cấp mã nội bộ đang dùng.

## 5. PRE-002 — Phòng thực tế

**Trạng thái:** Partial — nhận danh sách 7 phòng ngày 2026-08-17; còn thiếu tầng/khu và trạng thái ban đầu
**Owner:** Chủ dự án
**Nguồn:** `VMD_Bao_Gia_Phong_2026_Khach_Hang.docx`
**Ngày nhận:** 2026-08-17

| Mã phòng | Loại phòng | Sức chứa chuẩn | Trạng thái ban đầu |
|---|---|---:|---|
| `201` | Double Lake Window | 2 | Cần xác nhận |
| `202` | Family Loft Balcony | 4 | Cần xác nhận |
| `203` | Double City View | 2 | Cần xác nhận |
| `204` | Double Balcony | 2 | Cần xác nhận |
| `205` | Garden View | 2 | Cần xác nhận |
| `206` | Premium Garden View | 2 | Cần xác nhận |
| `207` | Premium Balcony View | 2 | Cần xác nhận |
| `301` | Doom (Dorm, chờ xác nhận chính tả) | 16 | Ngoài luồng đặt online Phase 1, xem §4 |

Tổng sức chứa chuẩn: **16 khách** trên 7 phòng 201–207 (chưa tính 301).

### Cập nhật 2026-08-19 — tầng/khu và trạng thái ban đầu

- **Tầng/khu:** vẫn chưa có xác nhận chính thức từ chủ dự án. Rate card 2026 chỉ ghi rõ tầng cho phòng `301` ("tầng áp mái"). Với 201–207, Claude **tạm suy luận** tầng 2 dựa trên quy ước đánh số `2xx` để có giá trị mặc định khi seed dữ liệu — đây là suy luận kỹ thuật, chưa phải xác nhận, chủ dự án nên chốt lại khi rảnh.
- **Trạng thái ban đầu:** chủ dự án ủy quyền cho Claude chọn cách hợp lý nhất (form 2026-08-19, câu 11). Đề xuất áp dụng: vocabulary `Sẵn sàng` / `Đang dọn` / `Bảo trì` / `Khóa`, mặc định tất cả 7 phòng 201–207 ở trạng thái `Sẵn sàng` tại thời điểm go-live 25/08/2026. Phòng `301` đặt `Chưa mở bán` cho tới khi có quyết định giá (§4).

### Còn thiếu cho PRE-002

1. Tầng/khu chính thức của 201–207 (hiện chỉ có suy luận kỹ thuật ở trên, cần chủ dự án xác nhận hoặc sửa).
2. Tên nội bộ nếu nhân viên gọi khác số phòng.
3. Xác nhận cách đặt tên chính thức cho phòng 301 ("Doom" hay "Dorm") và mô hình giá.

## 6. PRE-003 — Giá, phụ thu, thuế/phí và tiền cọc

**Trạng thái:** Partial — nhận bảng giá cập nhật ngày 2026-08-19 (thay thế bản 2026-08-17); VAT, hold TTL, làm tròn và cọc BBQ đã chốt
**Owner:** Chủ dự án
**Nguồn:** `VMD_Bao_Gia_Phong_2026_Khach_Hang.docx`, hiệu lực từ 25/08/2026 (bản có logo/letterhead, cập nhật 2026-08-19)
**Ngày nhận:** 2026-08-17, cập nhật 2026-08-19

> ⚠️ **File nguồn đã được chủ dự án cập nhật ngày 2026-08-19, cùng tên file nhưng số liệu khác hẳn bản 2026-08-17 đã ghi trước đó** (không phải sai số nhỏ — ví dụ phòng 202 từ 1.150.000–1.550.000đ xuống còn 800.000–900.000đ). Chủ dự án xác nhận **dùng bản 2026-08-19** làm giá chính thức (2026-08-19). Bảng giá bên dưới đã cập nhật theo bản mới; bản cũ không còn hiệu lực.

Tất cả số tiền là số nguyên VND, tính trên mỗi phòng mỗi đêm.

### Định nghĩa ngày — đã chốt

- **Ngày thường:** Chủ nhật đến Thứ năm.
- **Cuối tuần:** Thứ sáu và Thứ bảy.

Lưu ý kỹ thuật: cuối tuần ở đây là **T6–T7**, không phải T7–CN. Chủ nhật tính giá ngày thường.

### Bảng giá cơ bản (cập nhật 2026-08-19, thay thế bản 2026-08-17)

Giá **không bao gồm ăn sáng** (khác bản 2026-08-17 — bản đó gộp sẵn ăn sáng vào 2 trong 4 mức giá).

| Phòng | Hạng phòng | Sức chứa | Ngày thường (CN–T5) | Cuối tuần (T6–T7) |
|---|---|---:|---:|---:|
| 201 | Double Lake Window | 2 | 450.000 | 550.000 |
| 202 | Family Loft Balcony | 4 | 800.000 | 900.000 |
| 203 | Double City View | 2 | 500.000 | 600.000 |
| 204 | Double Balcony | 2 | 550.000 | 650.000 |
| 205 | Garden View | 2 | 600.000 | 700.000 |
| 206 | Premium Garden View | 2 | 700.000 | 800.000 |
| 207 | Premium Balcony View | 2 | 700.000 | 800.000 |
| 301 | Doom (16 khách, tầng áp mái) | 16 | Liên hệ | Liên hệ — ngoài Price Engine, xem §4/§5 |

Giá đã bao gồm **VAT 8%** (xác nhận 2026-08-19, form câu 12).

### Gói ăn sáng — đã chốt 2026-08-19

Chủ dự án xác nhận **chủ động bỏ gói ăn sáng khỏi giá bán** kể từ bản rate card 2026-08-19 — không phải thiếu dữ liệu. Phase 1 chỉ có **một mức giá phòng duy nhất mỗi loại ngày** (ngày thường/cuối tuần), không còn biến thể có/không ăn sáng. Price Engine không cần xử lý biến thể ăn sáng cho phòng nữa; nếu về sau muốn bán ăn sáng trở lại, đó là sản phẩm/task riêng chứ không phải biến thể giá phòng.

### Phụ thu

| Loại phụ thu | Điều kiện | Số tiền | Đơn vị |
|---|---|---:|---|
| Khách người lớn thêm, không ăn sáng | Vượt sức chứa chuẩn | 250.000 | người/đêm |
| Khách người lớn thêm, có ăn sáng | Vượt sức chứa chuẩn | 300.000 | người/đêm |
| Ăn sáng trẻ 6–11 tuổi | Nếu sử dụng | 50.000 | trẻ |
| Check-out 12:00–15:00 | Theo yêu cầu | 30% giá phòng 1 đêm | lần |
| Check-out 15:00–18:00 | Theo yêu cầu | 50% giá phòng 1 đêm | lần |
| Check-out sau 18:00 | Theo yêu cầu | 100% giá phòng 1 đêm | lần |

Check-in sớm: phụ thuộc tình trạng phòng và **cần xác nhận trước** — không có phụ thu cố định, xử lý thủ công. Gửi hành lý miễn phí trong ngày.

### Hệ số cao điểm — đã chốt 2026-08-19

| Giai đoạn | Nguyên tắc |
|---|---|
| Ngày thường (CN–T5) | Theo bảng giá tiêu chuẩn |
| Cuối tuần (T6–T7) | Theo bảng giá cuối tuần |
| Lễ, Tết, cao điểm | **+20% so với giá cuối tuần**, mức cố định duy nhất |

Chủ dự án chốt dùng **một mức cố định +20%** cho mọi dịp Lễ/Tết/cao điểm — xác nhận hai lần, form 2026-08-19 câu 1 và nhắc lại 2026-08-19 sau khi Claude nêu mâu thuẫn trong rate card. Đủ để Price Engine tính tự động, không cần bảng giai đoạn riêng. **Quyết định cuối cùng, không còn là điểm mở.**

> Việc còn lại không thuộc phạm vi kỹ thuật: chính tài liệu rate card khách hàng 2026-08-19 vẫn còn hai chỗ ghi khác nhau trong cùng file (một dòng ghi "phụ thu dịp lễ, tết: 20%", mục "3. Giá cao điểm, Lễ & Tết" phía dưới vẫn liệt kê 3 tầng +10–40% cũ). Hệ thống dùng +20% cố định; **chủ dự án nên sửa lại rate card khách hàng khi rảnh** để nhân viên tư vấn khách không đọc nhầm — việc này không chặn task nào.

### Tiền cọc — đã chốt

| Trường hợp | Mức thanh toán |
|---|---|
| Ngày thường và cuối tuần | Đặt cọc **50%** giá trị booking |
| Đặt trong vòng 3 ngày trước check-in | **100%** |
| Lễ, Tết, cao điểm | **100%** |

Phòng chỉ được giữ chính thức sau khi nhận được khoản thanh toán theo quy định.

### Hold TTL, làm tròn — đã chốt 2026-08-19

- **Hold TTL:** giữ chỗ tạm (chưa thanh toán) tối đa **2 tiếng (120 phút)** trước khi hệ thống tự hủy. Đã sửa trong code ngày 2026-08-19 (`BOOKING_HOLD_MINUTES` mặc định 15→120, trần 30→360 phút, xem `apps/api/src/modules/rooms/resource-holds.service.ts` và `booking-creation.service.ts`) — trước đó tài liệu đã ghi quyết định này nhưng code vẫn mặc định 15 phút, nay đã khớp.
- **Làm tròn:** làm tròn **xuống** đến đơn vị **nghìn đồng** cho mọi phép tính cọc/phụ thu ra số lẻ.

### Còn thiếu cho PRE-003

1. **Sức chứa tối đa** từng hạng phòng để biết được phép thêm bao nhiêu khách (liên quan PRE-001).
2. Có mã giảm giá đợt mở bán đầu không.
3. **Kênh Travel Agent có nằm trong Phase 1 không** — xem phần dưới.

### Kênh Travel Agent — nhận ngày 2026-08-17

**Nguồn:** `VMD_Bao_Gia_Phong_2026_Travel_Agent.docx`. Phần A giống hệt bản khách hàng; Phần B là phụ lục thương mại dành riêng cho đối tác lữ hành, **không phát hành cho khách lẻ**.

| Hình thức | Mức hoa hồng | Ghi chú |
|---|---|---|
| FIT / booking lẻ | 12% trên giá công bố | Agent Net Rate = **88%** giá niêm yết |
| Booking từ 5 phòng cùng kỳ | Tối đa 15% | Theo xác nhận từng lần |
| Sản lượng từ 15 room-night/tháng | Có thể nâng đến 15% | Đánh giá theo sản lượng thực tế và thanh toán đúng hạn |
| Lễ, Tết, cao điểm | Báo giá riêng | Xác nhận theo từng booking |

Nguyên tắc: đối tác không được công khai giá thấp hơn giá niêm yết nếu chưa có chương trình được duyệt. Hoa hồng tính trên tiền phòng hoặc gói phòng; phụ thu và dịch vụ khác chỉ tính khi có xác nhận riêng. Khuyến mại và voucher không tự động cộng dồn với hoa hồng.

Booking từ 5 phòng, buy-out gần toàn bộ 7 phòng, đoàn doanh nghiệp hoặc nhiều đêm liên tiếp: báo giá riêng, không mặc định cộng với hoa hồng tiêu chuẩn.

Chính sách hoàn/hủy áp dụng như Phần A trừ khi hợp đồng quy định khác.

**Quyết định cần chủ dự án chốt:** Phase 1 có bán qua kênh agent trên website không? Nếu **có**, cần thêm: quản lý đối tác, giá net theo đối tác, đối soát hoa hồng và voucher/rooming list — đây là khối lượng lớn, nên tách milestone riêng chứ không nhét vào `RMS-005`. Nếu **không**, quy trình agent vẫn chạy thủ công ngoài hệ thống ở Phase 1 và tài liệu này chỉ để tham chiếu.

### Pháp nhân và tài khoản nhận tiền — nhận ngày 2026-08-17

| Nội dung | Thông tin |
|---|---|
| Đơn vị | CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ XNK DHLC |
| Mã số thuế | 0111330155 |
| Địa chỉ đăng ký | Số 148 Đê Trần Khát Chân, Phường Vĩnh Tuy, TP Hà Nội |
| Email hóa đơn | dhlc.retail@gmail.com |
| Ngân hàng nhận tiền | MB Bank, số tài khoản kết thúc `8688` |

**Số tài khoản đầy đủ có trong tài liệu nguồn nhưng cố ý không chép vào Git.** Theo `AGENTS.md` §9 và §11, số tài khoản đầy đủ đặt trong secret store cùng cấu hình SePay khi triển khai `PAY-001`, không commit vào repository.

Đây là đầu vào cho `PAY-001` (nội dung chuyển khoản, tài khoản đích) và cho việc xuất hóa đơn ở `PRE-005`.

## 7. PRE-004 — Khu vực, bàn, khung giờ và combo BBQ

**Trạng thái:** Partial — khu vực/bàn/khung giờ/cọc đã nhận 2026-08-19; đủ để mở `BBQ-001`
**Owner:** Chủ dự án
**Nguồn:** Form thu thập thông tin, câu 1–6
**Ngày nhận:** 2026-08-19

### Khu vực và bàn — đã chốt 2026-08-19

| Khu vực | Số bàn | Sức chứa/bàn | Tổng khách tối đa |
|---|---:|---:|---:|
| Khu vườn thông trước | 6 | 6 | 36 |
| Khu sân gạch đỏ | 6 | 4 | 24 |
| Khu sân trước homestay | 10 | 4 | 40 |
| Khu vực ngồi trong nhà | 6 | 4 | 24 |
| Khu phòng VIP | 1 (bàn dài) | 12 | 12 |
| **Tổng** | **29 bàn** | | **136 khách** |

Mã khu vực/mã bàn cụ thể, sức chứa tối thiểu/bàn và quy tắc ghép bàn **chưa có** — chủ dự án mới cung cấp số lượng và sức chứa tối đa, cần bổ sung thêm khi triển khai `BBQ-001` schema chi tiết.

### Khung giờ — đã chốt 2026-08-19

- **Khung giờ mở cửa:** 11:00–14:00 và 18:00–22:00.
- **Cách đặt:** khách chọn giờ tự do trong khung mở cửa, **không chia slot cố định theo ca**. Không bắt buộc đặt trọn khung giờ.
- Thời gian dọn bàn giữa các lượt khách chưa có — cần chủ dự án bổ sung nếu muốn giới hạn số lượt/bàn/ngày.

### Cọc BBQ — đã chốt 2026-08-19

Yêu cầu đặt cọc giữ chỗ, mức **100.000–200.000đ/bàn** (form ghi "1-200k", xác nhận là thiếu số 0, đúng nghĩa 100.000–200.000đ). Chưa chốt mức cụ thể trong khoảng này theo tiêu chí nào (theo khu vực, theo sức chứa bàn, hay đồng giá) — cần chủ dự án chọn một mức cụ thể hoặc quy tắc chọn mức trước khi triển khai thu cọc.

### Combo/menu Phase 1

> ## ✅ Đã chốt ngày 2026-08-17: `MENU VƯỜN MĂNG ĐEN VER.1.md` là bản chuẩn
>
> Chủ dự án xác nhận **VER.1 là giá bán chính thức**. `Demo menu Vuon Mang Den.pdf` là bản demo chưa chốt và **không được dùng làm nguồn giá**.
>
> Phần đối chiếu bên dưới giữ lại để tra cứu: nếu về sau thấy giá nào khớp bản Demo thay vì VER.1, đó là lỗi cần sửa.

> ### Đối chiếu hai bản (bản Demo đã bị thay thế)
>
> Chủ dự án cung cấp **hai** tài liệu menu trong ngày 2026-08-17, cùng nằm trong thư mục `THIẾT KẾ`:
>
> | | Nguồn A | Nguồn B |
> |---|---|---|
> | File | `Demo menu Vuon Mang Den.pdf` | `MENU VƯỜN MĂNG ĐEN VER.1.md` |
> | Dạng | Bản dựng hình ảnh 9 trang | Bảng dữ liệu có ĐVT và ghi chú nội bộ |
> | Số set combo | 7 | 4 |
> | Có món lẩu | Không | Có (3 món) |
> | Có đơn vị tính | Không | **Có** |
> | Có số khách/set | Không | **Có** |
> | Có thành phần set | Không | **Có** |
> | Chính sách sốt chấm | **Không giới hạn** | **Khách chọn 2/4 loại** |
>
> **Giá lệch nhau rất lớn, không phải sai số nhỏ.** Ví dụ:
>
> | Món | Nguồn A | Nguồn B | Chênh |
> |---|---:|---:|---|
> | Soup cá tầm | 188.000 | 50.000 | **3,8×** |
> | Cơm lam nướng | 103.000 | 20.000 | **5,2×** |
> | Nấm rừng nướng | 147.000 | 89.000 | 1,7× |
> | Rau lủi xào bò | 80.000 | 145.000 | 1,8× |
> | Măng rừng xào bò | 106.000 | 179.000 | 1,7× |
> | Gà đen nướng nguyên con | 483.000 | 619.000 | 1,3× |
> | Cá tầm nướng giềng mẻ | 395.000 | 299.000 | 1,3× |
> | Set nướng Tứ Khoái | 404.000 | 369.000 | |
> | Set nướng Ngũ Cung | 498.000 | 439.000 | |
> | Set Vườn Măng Đen | 985.000 | 799.000 | |
> | Set cá tầm Măng Đen | 1.199.000 | 999.000 | |
>
> Ba set chỉ có ở nguồn A (Set gà 591.000, Set Bát Sơn 929.000, Set Đại Ngàn 1.225.000); ba món lẩu chỉ có ở nguồn B.
>
> Chủ dự án đã chốt: **dùng nguồn B**.

#### Nguồn B — `MENU VƯỜN MĂNG ĐEN VER.1.md` — ĐÃ DUYỆT

**Trạng thái:** Đã duyệt làm giá bán chính thức, 2026-08-17.

Bốn set combo kèm thành phần và số khách:

| Set | Giá VND | Số khách | Thành phần |
|---|---:|---|---|
| Set nướng Tứ Khoái | 369.000 | 2–3 | 4 món nướng + 2 cơm lam + củ quả |
| Set nướng Ngũ Cung | 439.000 | 3–4 | 5 món nướng + 3 cơm lam + củ quả |
| Set Vườn Măng Đen (lẩu nướng) | 799.000 | 3–4 | 3 phần nướng 150gr + lẩu cá tầm nhỏ + khoai chiên |
| Set cá tầm Măng Đen | 999.000 | Chưa ghi | Soup + nướng + rang muối + nem + om chuối đậu + lẩu/cháo |

Món lẩu: lẩu gà đen 429.000, lẩu cá tầm măng rừng 319.000, lẩu ếch măng cay 350.000 (đơn vị: nồi).

Đơn vị tính đã có: `đĩa`, `bát`, `phần`, `cái`, `nồi` — cần cho `BBQ-002`.

Sốt chấm: 5 loại (mè rang, núi rừng Măng Đen, BBQ, muối đỏ, giềng mẻ), ghi chú **khách chọn 2/4 loại** — mâu thuẫn nội tại vì liệt kê 5 loại. Cần làm rõ.

> ⚠️ **Nguồn B chứa ghi chú nội bộ không được đưa lên web**: chiến lược giá vốn ("chọn phương án bò thường giúp giữ cost đầu vào tốt", "giá bò bắp tại Măng Đen rẻ hơn bò mông"), nguồn hàng ("hàng sẵn HN-HCM xuất lên") và hướng dẫn chế biến. Khi triển khai `BBQ-002` phải tách rõ trường mô tả công khai và trường ghi chú nội bộ.

Danh sách món đầy đủ chưa chép vào tài liệu này vì còn chờ chốt nguồn; hai file gốc là nguồn.

### Còn thiếu cho PRE-004

**Không còn chặn `BBQ-002`** — nguồn giá đã chốt. Ba điểm nhỏ còn cần làm rõ nhưng không chặn schema/API:

1. Số khách cho `Set cá tầm Măng Đen` (VER.1 không ghi).
2. Set nào cho khách chỉnh món, set nào cố định.
3. Chính sách sốt chấm: VER.1 ghi "khách chọn 2/4 loại" nhưng liệt kê 5 loại. Cần xác nhận số lượng được chọn và món nào tính phí (VER.1 để trống cột giá cho toàn bộ sốt, hiểu là miễn phí).

**Không còn chặn `BBQ-001`** — khu vực/bàn/khung giờ/cọc đã nhận đủ để triển khai (xem trên). Còn thiếu để hoàn thiện schema chi tiết:

4. Mã khu vực/mã bàn chính thức, sức chứa tối thiểu mỗi bàn, quy tắc ghép bàn.
5. Thời gian dọn bàn giữa các lượt (nếu cần giới hạn số lượt/bàn/ngày).
6. Mức cọc cụ thể trong khoảng 100.000–200.000đ (đồng giá hay theo khu vực/sức chứa).
7. Phụ thu quá giờ và chính sách khách không đến — xem PRE-005, đã có chính sách hủy cơ bản nhưng chưa có phụ thu quá giờ.

## 8. PRE-005 — Chính sách vận hành và tài chính

**Trạng thái:** Partial — chính sách lưu trú cho phòng đã chốt ngày 2026-08-17; BBQ và kế toán vẫn thiếu
**Owner:** Chủ dự án
**Nguồn:** `VMD_Bao_Gia_Phong_2026_Khach_Hang.docx`
**Ngày nhận:** 2026-08-17

### Lưu trú — đã chốt

| Nội dung | Chính sách |
|---|---|
| Nhận phòng | Từ 14:00 |
| Trả phòng | Trước 12:00 |
| Check-in sớm | Phụ thuộc tình trạng phòng, cần xác nhận trước; không có phụ thu cố định |
| Check-out muộn | 12–15h: +30%; 15–18h: +50%; sau 18h: +100% giá phòng 1 đêm |
| Trẻ dưới 6 tuổi | Miễn phí khi ngủ chung giường bố mẹ |
| Trẻ 6–11 tuổi | Phụ thu ăn sáng 50.000đ/trẻ nếu dùng |
| Từ 12 tuổi | Tính như người lớn |
| Gửi hành lý | Miễn phí trong ngày, trước giờ nhận hoặc sau giờ trả phòng |

### Hủy và hoàn tiền — booking ngày thường và cuối tuần

| Thông báo trước check-in | Chính sách |
|---|---|
| Từ 7 ngày trở lên | Hoàn **100%** số tiền đã thanh toán |
| Từ 4–6 ngày | Hoàn **50%** |
| Từ 2–3 ngày | **Không hoàn tiền**; được đổi ngày 01 lần |
| Dưới 48 giờ | Không hoàn tiền và **không đổi ngày** |
| No-show | Không hoàn tiền; tính 100% giá trị booking |

### Hủy và hoàn tiền — Lễ, Tết và cao điểm

| Thông báo trước check-in | Chính sách |
|---|---|
| Từ 14 ngày trở lên | Hoàn **100%** |
| Từ 7–13 ngày | Hoàn **50%** |
| Dưới 7 ngày | Không hoàn tiền |
| No-show | Không hoàn tiền |

### Đổi ngày — đã chốt

- Chỉ **01 lần** cho mỗi booking.
- Ngày mới phải nằm trong **60 ngày** kể từ ngày lưu trú ban đầu, phụ thuộc tình trạng phòng.
- Giá mới cao hơn: khách trả phần chênh lệch. Giá mới thấp hơn: **không hoàn** phần chênh lệch.
- Sau khi đã đổi 01 lần, booking **mất quyền hoàn/hủy tiêu chuẩn**.
- Không chuyển nhượng booking cho người khác nếu chưa có xác nhận.

### Bất khả kháng — đã chốt

Thiên tai, bão, sạt lở, đường bị đóng, dịch bệnh: xử lý theo thứ tự ưu tiên **đổi ngày miễn phí → bảo lưu giá trị booking → hoàn tiền** nếu Homestay không thể cung cấp dịch vụ.

### Chính sách hủy/đổi BBQ — đã chốt 2026-08-19

Đề xuất của Claude dựa trên trả lời của chủ dự án (form câu 6, 16), đã được duyệt:

| Thời điểm báo hủy | Chính sách |
|---|---|
| Báo trước ≥ 1 tiếng so với giờ đặt bàn | Hoàn **100%** tiền cọc |
| Báo trước < 1 tiếng, hoặc không đến | **Mất cọc**, không hoàn |
| Đổi giờ/đổi ngày | Được đổi **01 lần**, nếu báo trước ≥ 1 tiếng và còn bàn trống |

### Người duyệt hoàn tiền, SLA và hóa đơn — đã chốt 2026-08-19

- **Người duyệt hoàn tiền:** Quản lý (áp dụng chung cho cả hoàn tiền phòng và BBQ, cho tới khi có phân quyền chi tiết hơn).
- **SLA xử lý hoàn tiền:** trong ngày sử dụng dịch vụ (ngày check-in/ngày đặt BBQ) — nhanh hơn đáng kể so với SLA 1–3 ngày làm việc của quy trình chuyển khoản nhầm CHB FOOD dùng làm tham chiếu (xem dưới).
- **Hóa đơn:** có xuất hóa đơn VAT. Đơn vị xuất hóa đơn là **DHLC** (khớp thông tin pháp nhân đã ghi ở §6 "Pháp nhân và tài khoản nhận tiền").

### Quy trình đối soát chuyển khoản — tham chiếu 2026-08-19, còn thiếu 2 trường hợp

**Nguồn:** SOP nội bộ CHB FOOD `008.VH-SOP-008-THUNGAN-Quy_trinh_xu_ly_chuyen_khoan_nham-v1.1.docx` (SOP thu ngân cho chuỗi F&B, không viết riêng cho VMD nhưng chủ dự án dùng làm quy trình tham chiếu).

Quy trình tổng quát cho case **chuyển thừa / chuyển nhầm tài khoản / chuyển trùng**: xác nhận giao dịch → lập biên bản có chữ ký khách + nhân sự + quản lý → chụp ảnh gửi nhóm vận hành tag Kế toán → Kế toán xác nhận, báo Quỹ → Quỹ hoàn **100% về đúng tài khoản đã chuyển** trong **1–3 ngày làm việc** → lưu trữ biên bản + ảnh giao dịch + thông tin hoàn tiền (Kế toán lưu).

> SOP CHB FOOD ở trên không đề cập 2 trường hợp cần cho `PAY-004`: khách **chuyển thiếu** và khách **chuyển muộn**. Hai case này khác với bối cảnh thu ngân tại quầy của SOP gốc, gắn liền với đặc thù booking online có giữ chỗ tạm (hold TTL 2 tiếng, PAY-002/003 chỉ tự khớp khi số tiền đúng chính xác). Chủ dự án giao Claude xây dựng phương án — đề xuất bên dưới.

### Chuyển thiếu — đề xuất của Claude 2026-08-19, **đã duyệt cùng ngày**

Bối cảnh kỹ thuật: `PAY-002`/`PAY-003` hiện chỉ tự động xác nhận khi số tiền khớp **chính xác** với số tiền yêu cầu; giao dịch thiếu tiền sẽ không tự khớp, cần `PAY-004` xử lý.

1. **Dung sai tự động:** giao dịch thiếu **≤ 10.000đ** so với số tiền yêu cầu (bù chênh phí ngân hàng) được coi là đủ, hệ thống tự xác nhận bình thường như khớp đúng. *(Chủ dự án duyệt mức 10.000đ ngày 2026-08-19.)*
2. **Thiếu nhiều hơn 10.000đ nhưng đúng mã booking trong nội dung chuyển khoản:** chuyển booking sang trạng thái "Chờ bổ sung tiền cọc"; **không reset hold** — vẫn tính từ mốc giữ chỗ ban đầu (2 tiếng); gửi thông báo yêu cầu khách chuyển bổ sung phần còn thiếu trước khi hold hết hạn.
   - Bổ sung đủ trước khi hết hạn → xác nhận booking bình thường, cộng dồn các lần chuyển.
   - Hold hết hạn mà chưa bổ sung đủ → hủy hold tự động (như hành vi `BKG-003` hiện có); số tiền đã nhận (dù thiếu) phải hoàn 100% cho khách theo đúng quy trình chuyển khoản nhầm/thừa ở SOP tham chiếu (biên bản, Kế toán xác nhận, Quỹ hoàn trong 1–3 ngày làm việc) — vì đây là tiền đã nhận nhưng không còn booking tương ứng.

### Chuyển muộn — đề xuất của Claude 2026-08-19, chờ chủ dự án duyệt

1. Giao dịch đến **sau khi hold đã hết hạn** (quá 2 tiếng) nhưng đúng mã booking trong nội dung chuyển khoản: hệ thống đánh dấu **"Thanh toán muộn — cần Quản lý xử lý thủ công"**, **không tự động khôi phục booking** (tránh xung đột tồn phòng/bàn đã được giữ lại cho khách khác).
2. Quản lý kiểm tra phòng/bàn theo ngày yêu cầu:
   - **Còn trống:** được quyền duyệt khôi phục booking ở đúng giá đã giữ ban đầu (thiện chí), tạo booking mới gắn với khoản thanh toán đã nhận, ghi audit rõ lý do "khôi phục do thanh toán muộn, phòng/bàn còn trống".
   - **Hết chỗ** (đã có khách khác đặt trong lúc chờ): không thể khôi phục; hoàn 100% số tiền đã nhận trong SLA hoàn tiền đã chốt (trong ngày sử dụng dịch vụ dự kiến), có thể chủ động đề nghị khách đổi sang ngày khác nếu còn phù hợp.
3. Không có nhánh xử lý tự động cho case này — nhất quán với nguyên tắc "Phase 1 không tự động hoàn tiền, mọi refund cần thao tác thủ công có audit và lý do" đã có.

### Còn thiếu cho PRE-005

1. Phụ thu quá giờ cho BBQ và chính sách khách không đến giữ bàn bao lâu trước khi hủy tự động.
2. **Chính sách lưu trữ chứng từ và dữ liệu thanh toán** cho riêng luồng online (SOP gốc chỉ nói lưu trữ phía Kế toán, chưa nói thời hạn lưu hay nơi lưu số hoá).
3. Định nghĩa chính xác "cao điểm" để hệ thống biết áp bảng hủy nào — ranh giới giữa "ngày thường/cuối tuần" và "Lễ/Tết/cao điểm" phụ thuộc lịch giai đoạn cụ thể, vẫn chưa có ở §6.

Phase 1 không tự động hoàn tiền; mọi refund vẫn cần thao tác thủ công có audit và lý do.

## 9. PRE-006 — Vai trò, quyền và trách nhiệm

**Trạng thái:** Ready — Chủ dự án đã duyệt toàn bộ decision packet ngày 2026-08-11
**Owner:** Chủ dự án
**Người duyệt:** Chủ dự án
**Ngày duyệt:** 2026-08-11

Các vai trò trong tài liệu kiến trúc cần chủ dự án xác nhận: Super Admin, Manager, Receptionist/Operations, Accountant, Marketing/Content.

| Chức năng | Super Admin | Manager | Reception/Operations | Accountant | Marketing/Content |
|---|---|---|---|---|---|
| Xem/tạo/sửa booking | Duyệt | Duyệt | Duyệt | Duyệt | Duyệt |
| Hủy/đổi lịch booking | Duyệt | Duyệt | Duyệt | Duyệt | — |
| Quản lý phòng/bàn | Duyệt | Duyệt | Duyệt | — | — |
| Quản lý giá/chính sách | Duyệt | Duyệt | — | Duyệt | — |
| Xem giao dịch | Duyệt | Duyệt | Theo nhu cầu | Duyệt | — |
| Điều chỉnh tài chính/refund | Duyệt | Duyệt | — | Duyệt | — |
| Xuất bản nội dung | Duyệt | Theo nhu cầu | — | — | Duyệt |
| Quản lý user/role | Duyệt | — | — | — | — |
| Xem audit log | Duyệt | Duyệt | — | Theo nhu cầu | — |

Quyết định bắt buộc:

- Ai là người xử lý booking chính?
- Ai trực payment reconciliation?
- Ai phê duyệt refund và điều chỉnh tài chính?
- MFA bắt buộc cho Super Admin và Accountant ở production; xác nhận có áp dụng thêm cho Manager không.
- SLA nội bộ cho booking mới, payment exception và notification failure.

### Gói đề xuất chờ Chủ dự án duyệt — 2026-08-11

Trạng thái: `APPROVED_BY_OWNER` ngày 2026-08-11. Chủ dự án xác nhận bằng văn bản: `Duyệt PRE-006 theo đề xuất`. Bảng này là nguồn chuẩn để IAM-002 seed và kiểm thử quyền; production vẫn phải đạt MFA/REL-001 trước go-live.

| Chức năng | Super Admin | Manager | Reception/Operations | Accountant | Marketing/Content |
|---|---|---|---|---|---|
| Xem booking | Toàn bộ | Toàn bộ | Toàn bộ | Chỉ đọc | Không |
| Tạo/sửa booking | Có | Có | Có | Không | Không |
| Hủy/đổi lịch | Có | Phê duyệt/thực hiện | Thực hiện theo chính sách đã duyệt | Không | Không |
| Quản lý phòng/bàn | Có | Có | Có | Không | Không |
| Quản lý giá/chính sách | Có | Có | Không | Chỉ đọc | Không |
| Xem giao dịch | Có | Có | Chỉ trạng thái cần vận hành, che PII | Có | Không |
| Đối soát/điều chỉnh tài chính | Có | Phê duyệt | Không | Tạo/xử lý hồ sơ | Không |
| Hoàn tiền Phase 1 | Phê duyệt | Phê duyệt | Không | Đề xuất/thực hiện thủ công sau duyệt | Không |
| Xuất bản nội dung | Có | Có | Không | Không | Có |
| Quản lý user/role | Có | Không | Không | Không | Không |
| Xem audit | Toàn bộ | Toàn bộ | Không | Audit tài chính | Không |

Quyết định bổ sung đã duyệt: MFA production bắt buộc cho Super Admin, Manager và Accountant; Reception/Operations xử lý booking chính, Manager dự phòng; Accountant trực payment reconciliation; Accountant đề xuất và Manager/Super Admin phê duyệt refund/điều chỉnh; SLA giờ vận hành lần lượt là 15 phút cho booking mới, 30 phút cho payment exception và 2 giờ cho notification failure.

## 10. PRE-007 — Domain và tích hợp

**Trạng thái:** Đã nhận một phần — đủ để mở `IAM-001` và `NTF-002` theo phạm vi staging-only; production vẫn bị chặn đến các gate riêng trước go-live.
**Owner:** Chủ dự án
**Người duyệt:** Chủ dự án
**Ngày duyệt:** 2026-08-10 (phạm vi identity development/staging)

Chỉ ghi identifier/reference; không ghi secret.

| Hạng mục | Giá trị không nhạy cảm cần cung cấp | Secret/reference cần tạo | Trạng thái |
|---|---|---|---|
| Public domain | **`vuonmangden.com`** — chủ dự án xác nhận 2026-09-03, đăng ký tại tenten.vn | DNS credential lưu ngoài repo | **Đã nhận** |
| Admin domain | Development: `http://localhost:3001`; production `https://admin.vuonmangden.com` | DNS credential lưu ngoài repo | **Đã nhận** |
| Supabase/PostgreSQL | Staging: project ref `atefkvykvwgtuaiscxnm`, Singapore (`ap-southeast-1`). Chủ dự án xác nhận **đã có khóa production** (2026-09-03). ⚠️ **Cần xác nhận ở `REL-002`:** khóa đó thuộc **project Supabase riêng cho production** hay vẫn là project staging dùng chung — tài liệu này (§10, 2026-08-10) yêu cầu production phải là project riêng. Dùng chung project nghĩa là dữ liệu khách thật và dữ liệu thử nằm cùng một database. | `DATABASE_URL`, service credential trong secret manager | **Đã nhận, cần xác nhận project riêng** |
| SePay | Chủ dự án xác nhận **đã có tài khoản/API production** (2026-08-19) và **đã có sẵn API key + định danh** (2026-09-03); giá trị cụ thể không ghi vào tài liệu này, nhập trực tiếp vào secret store khi triển khai | API/webhook secret trong secret manager | **Đã nhận** |
| Tài khoản ngân hàng | Chủ dự án xác nhận **đã có sẵn** số tài khoản/tên chủ TK/mã ngân hàng (2026-09-03); chỉ chia sẻ qua kênh an toàn, không ghi vào repo | Reference secret/config | **Đã nhận** |
| Email | **Domain `vuonmangden.com` đã Verified trong Resend lúc 2026-09-03 23:18** (region Tokyo `ap-northeast-1`; DNS verified 23:13, domain verified 23:18). SPF/DKIM/DMARC đã qua. From `Vườn Măng Đen <noreply@vuonmangden.com>`; reply-to `info@vuonmangden.com`. Production mở bằng `EMAIL_ENV=production` + `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` (fail-closed nếu thiếu) | `RESEND_API_KEY` trong secret manager | **Đã nhận** |
| Zalo | Chủ dự án xác nhận **chưa đăng ký Zalo Official Account** (2026-08-19) và quyết định **đưa Zalo ra khỏi đường găng go-live** (2026-09-03) — bật sau khi có OA. `NTF-009` đã chặn việc tạo job Zalo khi `ZALO_ENABLED` chưa bật, nên thiếu OA không còn sinh job hỏng | App secret/token trong secret manager | **Hoãn có chủ đích — không chặn go-live** |
| Object storage | Provider, region, bucket naming | Access key trong secret manager | Chờ dữ liệu |
| Hosting | Staging: Railway Variables; production secret store: Railway Variables đã chốt. **Lưu ý 2026-09-03:** `www.vuonmangden.com` hiện đang chạy trên **Vercel** (một trang đơn khác, không phải app này) — cần chốt lại phương án domain/hosting trong `REL-002` | Deploy credential trong secret manager | Đã nhận, cần đối chiếu ở REL-002 |

### ✅ Tên miền chính thức — đã chốt 2026-09-03

Chủ dự án xác nhận tên miền thật là **`vuonmangden.com`** (đăng ký tại tenten.vn).

Trước thời điểm này tài liệu và code dùng lẫn lộn ba cách viết — `vuonmangden.vn`,
`vuonmangden.com` và `vuongmangden.com` (thừa chữ `g`). Đã đồng bộ toàn bộ code,
test fixture và `.env.example` về `vuonmangden.com`. Các mục ghi `.vn` ở những phần
lịch sử bên dưới **giữ nguyên** làm bản ghi thời điểm, không sửa ngược.

**Không đổi** (đã chốt riêng ngày 2026-08-22, không liên quan tên miền):
- Email liên hệ công khai `vuonmangden.com@gmail.com` — đây là địa chỉ Gmail, phần
  trước dấu `@` tình cờ trông giống tên miền.
- Social handle `@vuonmangden`.

**Ảnh hưởng còn lại:** bản ghi SPF/DKIM của Resend phải tạo lại cho đúng
`vuonmangden.com`. Domain `vuongmangden.com` đăng ký nhầm trong Resend ngày
2026-08-11 đứng ở trạng thái Pending 23 ngày vì Resend đọc DNS của một tên miền
chủ dự án không sở hữu — cần xoá và thêm lại, khóa DKIM sẽ được sinh mới.

### Đầu vào identity đã nhận ngày 2026-08-10

- **Allowed CORS origins:** `http://localhost:3000`, `http://localhost:3001`, `http://localhost:3002`, `https://staging.vuonmangden.vn`.
- **Callback/redirect URLs:** `http://localhost:3001/auth/callback`, `https://staging.vuonmangden.vn/auth/callback`.
- **JWT:** issuer `https://atefkvykvwgtuaiscxnm.supabase.co/auth/v1`; audience `authenticated`; JWKS `https://atefkvykvwgtuaiscxnm.supabase.co/auth/v1/.well-known/jwks.json`.
- **Phương thức đăng nhập:** email/password bật; magic link tắt.
- **Phiên:** access token TTL 3600 giây; refresh-token rotation bật; logout phải revoke session phía server; khóa tài khoản phải revoke toàn bộ session.
- **MFA:** TOTP MFA bắt buộc cho Super Admin và Accountant ở production; Phase 1 chỉ enforce sau `IAM-002`; quy trình dự kiến là enroll, verify, sau đó yêu cầu TOTP code khi đăng nhập.
- **Secret management:** local dùng `.env` đã gitignore; staging dùng Railway Variables; production dùng Railway Variables hoặc Vercel Environment Variables; CI dùng GitHub Secrets; owner là Chủ dự án. Không ghi giá trị secret vào repository.

### Đầu vào production/email đề xuất nhận ngày 2026-08-10

- **Supabase production:** dùng chung project `atefkvykvwgtuaiscxnm` tại Singapore với staging; đây là thông tin hiện trạng, chưa phải quyết định production đã duyệt.
- **Admin production:** đề xuất `https://admin.vuonmangden.vn`, callback đề xuất `https://admin.vuonmangden.vn/auth/callback`.
- **CORS production:** chưa chốt; danh sách đề xuất là `https://vuonmangden.vn` và `https://admin.vuonmangden.vn`.
- **Email:** đề xuất Resend; Mailpit chỉ dùng staging; from đề xuất `Vườn Măng Đen <noreply@vuonmangden.vn>`; reply-to chưa chốt giữa `info@vuonmangden.vn` và `hotro@vuonmangden.vn`.
- **DNS gửi mail:** chưa xác minh; cần thêm SPF, DKIM và DMARC sau khi provider/identity được phê duyệt.
- **Secret management:** local `.env` (gitignored); staging Railway Variables của service `vmd-api`; production Railway Variables project riêng hoặc Vercel Environment Variables, chưa chốt provider; CI GitHub Secrets; owner là Chủ dự án.

### Xác nhận bổ sung ngày 2026-08-11

- **Tách môi trường Supabase:** Chủ dự án không chấp nhận dùng chung Supabase project cho staging và production. Project production phải là project riêng; URL/ref/region chưa được cung cấp.
- **Admin/CORS/callback production:** admin `https://admin.vuonmangden.vn`; CORS chính thức gồm `https://vuonmangden.vn`, `https://www.vuonmangden.vn`, `https://admin.vuonmangden.vn`; callback chính thức `https://admin.vuonmangden.vn/auth/callback`.
- **Email:** chốt Resend; Mailpit chỉ staging; from `Vườn Măng Đen <noreply@vuonmangden.vn>`; reply-to `info@vuonmangden.vn`; Chủ dự án xác nhận SPF, DKIM và DMARC đã xác minh.
- **Secret store production:** Railway Variables đã chốt; CI tiếp tục dùng GitHub Secrets.
- **Provider limits:** kế hoạch dùng free tier Resend 100 email/ngày theo intake; khi triển khai cần kiểm tra lại limit của plan đang đăng ký và đặt rate-limit/timeout theo tài liệu provider.

### Xác nhận staging-only ngày 2026-08-11 (ưu tiên hiện hành)

- **Supabase:** production chưa được tạo. `IAM-001` được phép triển khai trên staging project `atefkvykvwgtuaiscxnm` ở Singapore; staging không được dùng làm production. `REL-001` phải tạo project Supabase production riêng trước go-live.
- **Email:** `RESEND_API_KEY` là tên biến secret trong Railway Variables; không ghi giá trị vào Git. Tài khoản được đăng ký tại Resend; staging dùng Resend test mode hoặc Mailpit local.
- **DNS gửi mail:** trạng thái hiện hành là domain `vuonmangden.vn` cần xác minh SPF/DKIM trước gửi production. Bất kỳ xác nhận DNS trước đó đều được thay thế bởi trạng thái này.
- **Webhook/bounce:** ngoài phạm vi `NTF-002`. Task này chỉ gửi qua Resend API và lưu trạng thái kỹ thuật `sent`/`rejected` từ response; bounce/complaint tách sang `NTF-007` hoặc OPS task sau.
- **Production guard:** `IAM-001` và `NTF-002` chỉ được mở implementation cho staging; không cấu hình/deploy production, không gửi email production, và phải fail-closed khi thiếu cấu hình hợp lệ.

### Cách tạo Supabase project production riêng — trả lời 2026-08-19

Chủ dự án hỏi có cần nâng cấp gói để tạo project production riêng không. **Không cần.** Theo Supabase Pricing, một organization được giữ **tối đa 2 project active cùng lúc ở Free plan**, không giới hạn tổng số project — project rảnh quá 1 tuần tự động pause (không mất dữ liệu, kích hoạt lại khi cần). Vì đang có đúng 1 project staging (`atefkvykvwgtuaiscxnm`), tạo thêm 1 project production nữa vẫn nằm trong hạn miễn phí. Chỉ cần nâng gói nếu sau này cần project thứ 3 active cùng lúc.

### Cách xác minh SPF/DKIM cho Resend — trả lời 2026-08-19

1. Vào Resend Dashboard → Domains → Add Domain.
2. Nhập **subdomain** gửi mail (khuyến nghị dùng subdomain như `mail.vuonmangden.vn`, không dùng domain gốc, để tránh ảnh hưởng uy tín domain chính nếu có sự cố gửi mail).
3. Chọn region gần người nhận nhất.
4. Resend tự sinh bản ghi **MX + SPF (TXT) + DKIM** riêng cho domain vừa tạo — vào tab Records để lấy giá trị chính xác (giá trị này sinh động theo từng domain, không cố định trước được).
5. Copy chính xác các bản ghi vào nơi quản lý DNS của domain `vuonmangden.vn`.
6. Chờ xác minh — thường ~15 phút, tối đa 72 giờ.
7. Sau khi verify xong, nên thêm bản ghi DMARC (khuyến nghị của Resend, chưa bắt buộc).

### Phần còn thiếu và gate

1. `IAM-001` được mở staging-only. Cần Supabase production URL/ref/region riêng trong `REL-001` trước go-live; không tự dùng project staging làm production. Cách tạo đã có ở trên, chỉ còn chờ chủ dự án thực hiện.
2. `NTF-002` được mở staging-only với reference `RESEND_API_KEY`. Quy trình xác minh SPF/DKIM đã có ở trên; chủ dự án vẫn cần tự thực hiện (không giao thông tin đăng nhập DNS/Resend cho agent). Bounce/complaint webhook là `NTF-007` hoặc OPS task sau.
3. SePay đã có tài khoản nhưng cần identifier cụ thể; ngân hàng, object storage và public domain vẫn chờ dữ liệu; Zalo OA chưa đăng ký. Các task Payment/Notification/Deployment tương ứng chưa được mở.

## 11. PRE-008 — Thương hiệu, asset và nội dung

**Trạng thái:** Chờ dữ liệu
**Owner:** Chủ dự án
**Người duyệt:** Chưa xác định
**Ngày duyệt:** Chưa xác định

### Dữ liệu đã nhận ngày 2026-08-10

- **Tên thương hiệu:** Vườn Măng Đen — Homestay & BBQ.
- **Logo nguồn:** [Google Drive PNG](https://drive.google.com/file/d/1QQEWAp26LI5PU3Vp6-mJ1-ALrdRBpcQp/view), Drive ID `1QQEWAp26LI5PU3Vp6-mJ1-ALrdRBpcQp`. Link tải được tại thời điểm intake; file không được commit vào Git trước khi chủ dự án xác nhận quyền dùng trên web.
- **Brand board:** do chủ dự án gửi qua Codex ngày 2026-08-10. Ý nghĩa hình ảnh: ngôi nhà/tay ấm, rừng thông Măng Đen và ngọn lửa BBQ.
- **Palette theo brand board:** `#1F3A2E`, `#365442`, `#7A5033`, `#D86B2A`, `#F1E6D2`.
- **Typography:** Bahnschrift Condensed Regular/SemiBold. Chưa có web-font file, license/source web hoặc quyết định fallback cho thiết bị không có font này.
- **Thông tin được phép hiển thị public:** hotline `1900 9085`; email `vuongmangden.com@gmail.com`; địa chỉ `26 Đường Phạm Văn Đồng, Măng Đen, Quảng Ngãi`; social handle `@vuonmangden`.
- **Giới thiệu ngắn:** “Nơi nghỉ dưỡng, giao lưu kết nối bạn bè”.
- **URL public do chủ dự án cung cấp ngày 2026-08-10:** [Facebook](https://www.facebook.com/MangDenGarden/); [TikTok](https://www.tiktok.com/@vuonmangden); [Instagram](https://www.instagram.com/vuonmangden); [Google Maps](https://maps.app.goo.gl/DtzdH58QEz2p1iYW8).

### ✅ Thông tin liên hệ — đã chốt 2026-08-22

Chủ dự án xác nhận bản **2026-08-17** (hai bảng giá) là đúng: địa chỉ **24 Đường Phạm Văn Đồng**, hotline **0972 947 942**, email **vuonmangden.com@gmail.com**. Website công khai (`apps/web/app/page.tsx`, `apps/web/app/thanh-toan/payment-status.tsx`) đã sửa theo đúng ba giá trị này (nhánh `fix/public-contact-info`). Phần đối chiếu bên dưới giữ lại để tra cứu lịch sử.

### ⚠️ Mâu thuẫn thông tin liên hệ (đã giải quyết, xem trên) — nguyên văn lúc phát hiện

Hai tài liệu giá nhận ngày 2026-08-17 — bản khách hàng và bản Travel Agent — ghi **cùng một** thông tin liên hệ, và nó **khác** dữ liệu PRE-008 nhận ngày 2026-08-10:

| Mục | PRE-008 (2026-08-10) | Cả hai bảng giá (2026-08-17) |
|---|---|---|
| Địa chỉ | 26 Đường Phạm Văn Đồng | **24** Đường Phạm Văn Đồng |
| Hotline | 1900 9085 | **0972 947 942** (kèm Zalo) |
| Email | vuo**ng**mangden.com@gmail.com | vuonmangden.com@gmail.com |

Ba mục đều lệch. Email chênh đúng một chữ (`vuong` với `vuon`) nên nhiều khả năng một bên là lỗi đánh máy. Hai tài liệu mới nhất, cùng ngày, thống nhất với nhau và đều là tài liệu phát hành ra ngoài — nên bản 2026-08-17 **có vẻ** đúng hơn.

`CMS-005` hiện đang hiển thị bản PRE-008 trên website công khai.

**Vẫn không tự chọn bên nào.** Đây là thông tin liên hệ công khai; sai địa chỉ hoặc hotline khiến khách không tới hoặc không gọi được. Cần chủ dự án xác nhận rồi mới sửa nội dung public.

### Hạng mục vẫn cần chủ dự án xác nhận/cung cấp

1. Cung cấp hoặc tạm hoãn các link pháp lý và CTA/đích đến ngoài hotline, email, Maps và social URL đã duyệt; không tự tạo link không có trang đích.
2. Cung cấp ảnh không gian/phòng/BBQ có quyền sử dụng trước khi thêm ảnh venue vào website.
3. ~~Chốt địa chỉ, hotline và email chính xác theo bảng mâu thuẫn ở trên.~~ Đã chốt 2026-08-22, xem mục trên.

### Phê duyệt phạm vi CMS-005 ngày 2026-08-10

- Chủ dự án xác nhận có quyền dùng logo PNG và brand board cho website.
- Homepage giai đoạn đầu được phép không dùng ảnh venue.
- Dùng `Bahnschrift Condensed` theo system font, với fallback khi thiết bị không có font này.

| Nhóm asset/nội dung | Nguồn/link | Owner | Quyền sử dụng đã xác nhận | Trạng thái duyệt |
|---|---|---|---|---|
| Brand board | Chủ dự án gửi qua Codex, 2026-08-10 | Chủ dự án | Đã xác nhận dùng trên web | Đã duyệt cho CMS-005 |
| Logo PNG | Google Drive ID `1QQEWAp26LI5PU3Vp6-mJ1-ALrdRBpcQp` | Chủ dự án | Đã xác nhận dùng trên web | Đã duyệt cho CMS-005 |
| Palette và typography | Brand board ngày 2026-08-10 | Chủ dự án | Palette đã duyệt; Bahnschrift Condensed system font có fallback được duyệt | Đã duyệt cho CMS-005 |
| Thông tin liên hệ và giới thiệu | Tin nhắn chủ dự án ngày 2026-08-10 | Chủ dự án | Được cung cấp để hiển thị public | Đã nhận |
| Facebook/TikTok/Instagram/Google Maps | Tin nhắn chủ dự án ngày 2026-08-10 | Chủ dự án | Được cung cấp để hiển thị public | Đã nhận |
| Ảnh venue/phòng/BBQ | Chưa cung cấp | Chủ dự án | Không dùng trong homepage giai đoạn đầu | Không chặn CMS-005 |
| Link pháp lý/CTA | Chưa cung cấp | Chủ dự án | Chưa xác nhận | Chờ dữ liệu |

## 12. Điều kiện đóng BLK-001

`BLK-001` chỉ được đóng khi:

- PRE-001 đến PRE-008 có owner, bằng chứng/link và trạng thái được cập nhật trong tracker.
- Các nhóm P0 có đầy đủ dữ liệu và được duyệt trước khi task nghiệp vụ phụ thuộc chuyển sang `Ready`.
- Không có secret thật trong Git; secret chỉ được tham chiếu bằng tên/reference.
- Các quyết định giá, cọc, hủy/đổi/hoàn tiền, quyền và kế toán có người duyệt/ngày duyệt.
- Dữ liệu phòng/bàn/giá có định dạng đủ để import hoặc tạo seed vận hành có kiểm soát.
- Nội dung email/Zalo production được owner vận hành duyệt trước khi bật provider thật.

## 13. Nhật ký duyệt

| Ngày | Nhóm | Người duyệt | Quyết định/thay đổi | Bằng chứng |
|---|---|---|---|---|
| Chờ cập nhật |  |  |  |  |
| 2026-08-11 | PRE-007 staging-only | Chủ dự án | Cho phép `IAM-001` và `NTF-002` triển khai trên staging; production fail-closed đến `REL-001` và DNS verification | Tin nhắn chủ dự án ngày 2026-08-11 |
| 2026-08-17 | PRE-004 | Chủ dự án | Cung cấp thêm `MENU VƯỜN MĂNG ĐEN VER.1.md` — bản có đơn vị tính, số khách mỗi set, thành phần set và ghi chú nội bộ. **Phát hiện mâu thuẫn lớn với `Demo menu Vuon Mang Den.pdf`**: giá lệch tới 5,2 lần ở một số món, số set khác nhau (4 với 7), nguồn B có lẩu mà nguồn A không có, chính sách sốt chấm trái ngược. `BBQ-002` tiếp tục bị chặn cho tới khi chủ dự án chỉ rõ bản nào là giá bán chính thức | `MENU VƯỜN MĂNG ĐEN VER.1.md` |
| 2026-08-17 | PRE-004 (menu), PRE-003 (agent), PRE-007 (pháp nhân) | Chủ dự án | Cung cấp thêm `VMD_Bao_Gia_Phong_2026_Travel_Agent.docx` và `Demo menu Vuon Mang Den.pdf`. Ghi nhận: 7 set combo BBQ và menu à la carte 6 nhóm (**chờ xác nhận vì là bản "Demo" trong thư mục thiết kế**); cơ chế hoa hồng agent 12–15% với Net Rate 88%; pháp nhân DHLC, MST 0111330155, email hóa đơn và tài khoản MB Bank (số đầy đủ không commit vào Git). PRE-004 chuyển `Blocked` → `Partial`; phần khu vực/bàn/khung giờ vẫn trống | `VMD_Bao_Gia_Phong_2026_Travel_Agent.docx`, `Demo menu Vuon Mang Den.pdf` |
| 2026-08-17 | PRE-001, PRE-002, PRE-003, PRE-005 | Chủ dự án | Cung cấp bảng giá phòng và chính sách đặt phòng 2026 hiệu lực từ 25/08/2026: 7 phòng 201–207 với 7 hạng phòng, giá ngày thường/cuối tuần × không sáng/có sáng, gói ăn sáng, phụ thu khách thêm và check-out muộn, hệ số cao điểm/Lễ Tết, mức cọc 50%/100%, giờ nhận-trả phòng, chính sách trẻ em, hai bảng hủy hoàn theo giai đoạn, điều kiện đổi ngày và xử lý bất khả kháng. Bốn nhóm chuyển từ `Blocked` sang `Partial`. Phát hiện mâu thuẫn địa chỉ/hotline/email với PRE-008 — chưa tự chọn bên nào | `VMD_Bao_Gia_Phong_2026_Khach_Hang.docx` do chủ dự án cung cấp ngày 2026-08-17 |
| 2026-08-19 | PRE-001, PRE-002, PRE-004, PRE-005 | Chủ dự án | Điền form thu thập thông tin 27 câu: khu vực/bàn/khung giờ/cọc BBQ (mở khóa `BBQ-001`); chính sách hủy BBQ do Claude đề xuất, chủ dự án duyệt; người duyệt hoàn tiền = Quản lý, SLA = trong ngày sử dụng dịch vụ; hóa đơn VAT xuất bởi DHLC; VAT phòng 8%, hold TTL 2 tiếng, làm tròn xuống nghìn đồng; phát sinh hạng phòng thứ 8 "Doom/Dorm" (301, 16 khách, giá liên hệ) ngoài phạm vi 7 phòng ban đầu; tầng/trạng thái ban đầu của 201–207 giao Claude tự quyết. Đóng PR #40 (MNT-001 cũ) theo quyết định chủ dự án | `VMD-Form-Thong-Tin-Con-Thieu.docx` (đã điền) do chủ dự án cung cấp ngày 2026-08-19 |
| 2026-08-19 | PRE-003 | Chủ dự án | Cung cấp bản cập nhật `VMD_Bao_Gia_Phong_2026_Khach_Hang.docx` (có logo/letterhead), **thay thế bảng giá phòng cơ bản đã ghi ngày 2026-08-17** — giá thấp hơn đáng kể (vd. phòng 202 từ 1,15–1,55tr xuống 800–900k), bỏ cách tách giá theo có/không ăn sáng, gộp phụ thu Lễ/Tết về một mức cố định +20%. Chủ dự án xác nhận dùng bản mới. Giá gói ăn sáng riêng chưa có trong bản mới — phát sinh khoảng trống dữ liệu mới, không chặn task nào hiện tại | `VMD_Bao_Gia_Phong_2026_Khach_Hang.docx` cập nhật 2026-08-19 |
| 2026-08-19 | PRE-005 | Chủ dự án | Cung cấp SOP nội bộ CHB FOOD xử lý chuyển khoản nhầm/chuyển thừa, dùng làm quy trình tham chiếu cho `PAY-004`. SOP không có case chuyển thiếu/chuyển muộn — ghi nhận là khoảng trống còn lại, không chặn `PAY-004` (vẫn Backlog chờ `PAY-003`) | `008.VH-SOP-008-THUNGAN-Quy_trinh_xu_ly_chuyen_khoan_nham-v1.1.docx` |
| 2026-08-19 | PRE-003, PRE-005 | Chủ dự án | Xác nhận: (1) bỏ gói ăn sáng khỏi giá bán là chủ động, không phải thiếu dữ liệu — đóng khoảng trống; (2) chốt lại lần hai mức cố định +20% Lễ/Tết/cao điểm sau khi Claude nêu rate card khách hàng còn mâu thuẫn nội bộ; (3) giao Claude xây dựng phương án xử lý chuyển thiếu/chuyển muộn — đã thêm vào §8, gồm dung sai 10.000đ (đề xuất, chờ duyệt số cụ thể) và quy trình Quản lý xử lý thủ công theo tình trạng phòng/bàn còn trống | Tin nhắn chủ dự án 2026-08-19 |
| 2026-08-19 | PRE-001, CMS-001, ADM-001 | Chủ dự án | Ba quyết định: (1) phòng `301` "Doom/Dorm" xử lý thủ công tạm thời, giữ ngoài Price Engine, chủ dự án sẽ báo lại khi chốt cơ chế giá riêng; (2) vai trò MARKETING tạm thời KHÔNG được sửa site settings — khớp sẵn với `SETTINGS_WRITE_ROLES` hiện tại trong code, không cần sửa; (3) đồng ý dùng Supabase Admin API để mời nhân viên mới, mở khóa phần còn thiếu của `ADM-001` | Tin nhắn chủ dự án 2026-08-19 |
| 2026-08-19 | PRE-001, PRE-005 | Chủ dự án | Ba quyết định thêm: (1) duyệt mức dung sai chuyển thiếu 10.000đ — mở khóa code `PAY-004`; (2) sức chứa tối đa mỗi phòng = sức chứa chuẩn (2 khách, riêng 202 là 4 khách) — đóng gap PRE-001, phát sinh lưu ý kỹ thuật là 2 dòng phụ thu "khách thêm" trong bảng giá sẽ không bao giờ áp dụng được với số này; (3) giữ mã khu vực/bàn BBQ tạm do Claude sinh cho tới khi chủ dự án cấp mã chính thức | Tin nhắn chủ dự án 2026-08-19 |
