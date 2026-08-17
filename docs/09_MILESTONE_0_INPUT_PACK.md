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

### Còn thiếu cho PRE-001

1. Cấu hình giường của 6 hạng còn lại (chỉ `Family Loft Balcony` được mô tả).
2. **Sức chứa tối đa từng hạng.** Bảng giá có phụ thu khách thêm 250.000–300.000đ/người/đêm nên sức chứa tối đa lớn hơn sức chứa chuẩn, nhưng trần cụ thể chưa có. Price Engine và Availability cần con số này để chặn đặt quá tải.
3. Danh sách tiện nghi để hiển thị trên web (điều hòa, nước nóng, TV, wifi…).
4. Xác nhận cả 7 hạng đều mở bán Phase 1.
5. Duyệt mã loại phòng, hoặc cung cấp mã nội bộ đang dùng.

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

Tổng sức chứa chuẩn: **16 khách** trên 7 phòng.

### Còn thiếu cho PRE-002

1. Tầng/khu của từng phòng. Đánh số `2xx` gợi ý tất cả ở tầng 2 nhưng **không được suy đoán** — cần xác nhận.
2. Trạng thái ban đầu từng phòng: `ACTIVE`, `INACTIVE` hay `MAINTENANCE`. Chủ dự án cũng cần duyệt bộ vocabulary này.
3. Tên nội bộ nếu nhân viên gọi khác số phòng.
4. Có phòng nào chưa sẵn sàng đón khách vào ngày mở bán 25/08/2026 không.

## 6. PRE-003 — Giá, phụ thu, thuế/phí và tiền cọc

**Trạng thái:** Partial — nhận bảng giá đầy đủ ngày 2026-08-17; còn thiếu thuế/VAT, làm tròn, hold TTL và cọc BBQ
**Owner:** Chủ dự án
**Nguồn:** `VMD_Bao_Gia_Phong_2026_Khach_Hang.docx`, hiệu lực từ 25/08/2026
**Ngày nhận:** 2026-08-17

Tất cả số tiền là số nguyên VND, tính trên mỗi phòng mỗi đêm.

### Định nghĩa ngày — đã chốt

- **Ngày thường:** Chủ nhật đến Thứ năm.
- **Cuối tuần:** Thứ sáu và Thứ bảy.

Lưu ý kỹ thuật: cuối tuần ở đây là **T6–T7**, không phải T7–CN. Chủ nhật tính giá ngày thường.

### Bảng giá cơ bản

| Phòng | Hạng phòng | Sức chứa | Ngày thường không sáng | Ngày thường có sáng | Cuối tuần không sáng | Cuối tuần có sáng |
|---|---|---:|---:|---:|---:|---:|
| 201 | Double Lake Window | 2 | 650.000 | 750.000 | 750.000 | 850.000 |
| 202 | Family Loft Balcony | 4 | 1.150.000 | 1.350.000 | 1.350.000 | 1.550.000 |
| 203 | Double City View | 2 | 600.000 | 700.000 | 700.000 | 800.000 |
| 204 | Double Balcony | 2 | 700.000 | 800.000 | 800.000 | 900.000 |
| 205 | Garden View | 2 | 750.000 | 850.000 | 850.000 | 950.000 |
| 206 | Premium Garden View | 2 | 850.000 | 950.000 | 950.000 | 1.050.000 |
| 207 | Premium Balcony View | 2 | 850.000 | 950.000 | 950.000 | 1.050.000 |

### Gói ăn sáng

- Phòng 2 khách: +100.000đ/phòng/đêm (50.000đ/khách).
- Phòng 202 (4 khách): +200.000đ/phòng/đêm.

Ăn sáng là một **biến thể giá của phòng**, không phải phụ thu rời — bảng giá đã liệt kê sẵn cả hai mức.

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

### Hệ số cao điểm

| Giai đoạn | Nguyên tắc |
|---|---|
| Ngày thường (CN–T5) | Theo bảng giá tiêu chuẩn |
| Cuối tuần (T6–T7) | Theo bảng giá cuối tuần |
| Cao điểm / sự kiện địa phương | +10% đến +20% **so với giá cuối tuần** |
| Lễ, Tết | +25% đến +30% **so với giá cuối tuần** |
| Đỉnh nhu cầu đặc biệt | Linh hoạt, tối đa khoảng +40% |

Đây là **khoảng tham chiếu, không phải giá cố định** — tài liệu ghi rõ giá cuối cùng được xác nhận tại thời điểm đặt phòng. Price Engine không thể tự chọn trong khoảng; cần bảng giá cụ thể theo từng giai đoạn hoặc một mức cố định được duyệt.

### Tiền cọc — đã chốt

| Trường hợp | Mức thanh toán |
|---|---|
| Ngày thường và cuối tuần | Đặt cọc **50%** giá trị booking |
| Đặt trong vòng 3 ngày trước check-in | **100%** |
| Lễ, Tết, cao điểm | **100%** |

Phòng chỉ được giữ chính thức sau khi nhận được khoản thanh toán theo quy định.

### Còn thiếu cho PRE-003

1. **Giá đã bao gồm thuế/VAT chưa?** Ảnh hưởng trực tiếp tới cách hiển thị và xuất hóa đơn.
2. **Bảng giá cụ thể cho cao điểm/Lễ/Tết.** Khoảng +10–40% không đủ để Price Engine tính tự động; cần hoặc danh sách giai đoạn kèm hệ số chốt, hoặc chấp nhận nhân viên nhập giá thủ công cho các giai đoạn đó.
3. **Lịch các giai đoạn cao điểm/Lễ/Tết năm 2026–2027** để hệ thống biết ngày nào áp mức nào.
4. **Số phút giữ chỗ (hold TTL)** trước khi booking chưa thanh toán hết hạn. Tài liệu kỹ thuật đề xuất 15 phút, `prisma/seed.ts` đang để tạm 15 phút — cần chủ dự án chốt cho production.
5. **Quy tắc làm tròn** khi tính 50% cọc hoặc 30%/50% phụ thu check-out muộn cho số lẻ.
6. **Sức chứa tối đa** để biết được phép thêm bao nhiêu khách (liên quan PRE-001).
7. **Cọc BBQ** — chưa có, thuộc PRE-004.
8. Có mã giảm giá đợt mở bán đầu không.
9. **Kênh Travel Agent có nằm trong Phase 1 không** — xem phần dưới.

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

**Trạng thái:** Chờ dữ liệu
**Owner:** Chủ dự án
**Người duyệt:** Chưa xác định
**Ngày duyệt:** Chưa xác định

### Khu vực và bàn

| Mã khu vực | Tên khu vực | Mã bàn | Sức chứa tối thiểu | Sức chứa tối đa | Cho phép ghép bàn | Trạng thái |
|---|---|---|---:|---:|---|---|
| Cần chủ dự án cung cấp |  |  |  |  |  |  |

### Khung giờ

| Mã khung giờ | Giờ bắt đầu | Thời lượng sử dụng | Thời gian dọn bàn | Ngày áp dụng | Giới hạn khách |
|---|---|---|---|---|---:|
| Cần chủ dự án cung cấp |  |  |  |  |  |

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

**Chặn `BBQ-001` và `BBQ-003` — chưa nhận gì:**

5. **Khu vực và bàn**: mã khu vực, mã bàn, sức chứa tối thiểu/tối đa, có cho ghép bàn không, trạng thái.
6. **Khung giờ**: giờ bắt đầu, thời lượng sử dụng, thời gian dọn bàn, ngày áp dụng, giới hạn khách.
7. Quy tắc ghép bàn và giới hạn đặt trước.
8. **Mức cọc BBQ** — bảng giá phòng chỉ nói cọc phòng.
9. Phụ thu quá giờ và chính sách khách không đến (thuộc PRE-005).

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

### Còn thiếu cho PRE-005

1. **Toàn bộ chính sách BBQ** — hủy/đổi, no-show, đến muộn giữ bàn bao lâu, hoàn cọc. Thuộc PRE-004.
2. **Ai được duyệt hoàn tiền** và **SLA xử lý** (bao nhiêu ngày làm việc). Cần cho `PAY-004`/`PAY-005` và luồng refund có audit.
3. **Quy tắc và thời điểm xuất hóa đơn.**
4. **Quy trình khi khách chuyển thiếu, thừa, sai nội dung hoặc muộn** — cần cho `PAY-004` Reconciliation.
5. **Chính sách lưu trữ chứng từ và dữ liệu thanh toán.**
6. Định nghĩa chính xác "cao điểm" để hệ thống biết áp bảng hủy nào — hai bảng hủy khác nhau nhưng ranh giới giữa "ngày thường/cuối tuần" và "Lễ/Tết/cao điểm" phụ thuộc lịch giai đoạn ở §6.

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
| Public domain | Chưa cung cấp | DNS credential lưu ngoài repo | Chờ dữ liệu |
| Admin domain | Development: `http://localhost:3001`; production `https://admin.vuonmangden.vn` đã chốt | DNS credential lưu ngoài repo | Đã nhận |
| Supabase/PostgreSQL | Staging: project ref `atefkvykvwgtuaiscxnm`, URL `https://atefkvykvwgtuaiscxnm.supabase.co`, Singapore (`ap-southeast-1`); production chưa tạo và phải dùng project riêng trong `REL-001` trước go-live | `DATABASE_URL`, service credentials trong secret manager | Đủ staging-only |
| SePay | Merchant/account identifier, môi trường test | API/webhook secret trong secret manager | Chờ dữ liệu |
| Tài khoản ngân hàng | Tên ngân hàng, tên chủ tài khoản, số tài khoản chỉ chia sẻ qua kênh an toàn | Reference secret/config | Chờ dữ liệu |
| Email | Resend đã chốt; staging dùng Resend test mode hoặc Mailpit local; from `Vườn Măng Đen <noreply@vuonmangden.vn>`; reply-to `info@vuonmangden.vn`; domain `vuonmangden.vn` cần xác minh SPF/DKIM trước gửi production | Railway Variables: `RESEND_API_KEY` | Đủ staging-only |
| Zalo | OA identifier, trạng thái ZNS template | App secret/token trong secret manager | Chờ dữ liệu |
| Object storage | Provider, region, bucket naming | Access key trong secret manager | Chờ dữ liệu |
| Hosting | Staging: Railway Variables; production secret store: Railway Variables đã chốt | Deploy credential trong secret manager | Đã nhận |

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

### Phần còn thiếu và gate

1. `IAM-001` được mở staging-only. Cần Supabase production URL/ref/region riêng trong `REL-001` trước go-live; không tự dùng project staging làm production.
2. `NTF-002` được mở staging-only với reference `RESEND_API_KEY`. Xác minh SPF/DKIM cho production vẫn do Chủ dự án thực hiện; không ghi key vào Git. Bounce/complaint webhook là `NTF-007` hoặc OPS task sau.
3. SePay, Zalo, ngân hàng, object storage và public domain vẫn chờ dữ liệu; các task Payment/Notification/Deployment tương ứng chưa được mở.

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

### ⚠️ Mâu thuẫn thông tin liên hệ — cần chủ dự án chốt

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
3. Chốt địa chỉ, hotline và email chính xác theo bảng mâu thuẫn ở trên.

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
