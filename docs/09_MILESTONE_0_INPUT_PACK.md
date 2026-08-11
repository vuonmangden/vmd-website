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

**Trạng thái:** Ready cho `CMS-005` — chủ dự án đã duyệt phạm vi layout ngày 2026-08-10; dữ liệu legal/CTA ngoài phạm vi vẫn chưa được cung cấp
**Owner:** Chủ dự án
**Người duyệt:** Chủ dự án
**Ngày duyệt:** 2026-08-10

Điền một dòng cho mỗi loại phòng:

| Mã loại | Tên hiển thị | Sức chứa chuẩn | Sức chứa tối đa | Cấu hình giường | Tiện nghi chính | Mô tả ngắn | Trạng thái mở bán |
|---|---|---:|---:|---|---|---|---|
| Cần chủ dự án cung cấp |  |  |  |  |  |  |  |

Quyết định bổ sung:

- Trẻ em được tính vào sức chứa theo quy tắc nào?
- Có cho phép kê thêm giường/nệm không? Nếu có, giới hạn và phụ thu thuộc PRE-003.
- Loại phòng nào chưa sẵn sàng mở bán trong Phase 1?

## 5. PRE-002 — Phòng thực tế

**Trạng thái:** Chờ dữ liệu
**Owner:** Chủ dự án
**Người duyệt:** Chưa xác định
**Ngày duyệt:** Chưa xác định

| Mã phòng duy nhất | Loại phòng | Tên nội bộ | Tầng/khu | Sức chứa | Trạng thái ban đầu | Ghi chú vận hành |
|---|---|---|---|---:|---|---|
| Cần chủ dự án cung cấp |  |  |  |  |  |  |

Trạng thái ban đầu đề nghị dùng một trong: `ACTIVE`, `INACTIVE`, `MAINTENANCE`; chủ dự án cần duyệt vocabulary cuối cùng trước khi tạo schema nghiệp vụ.

## 6. PRE-003 — Giá, phụ thu, thuế/phí và tiền cọc

**Trạng thái:** Chờ dữ liệu
**Owner:** Chủ dự án
**Người duyệt:** Chưa xác định
**Ngày duyệt:** Chưa xác định

Tất cả số tiền dùng số nguyên VND.

| Loại phòng | Giá ngày thường/đêm | Giá cuối tuần/đêm | Định nghĩa cuối tuần | Giá lễ | Giai đoạn áp dụng | Số khách bao gồm |
|---|---:|---:|---|---|---|---:|
| Cần chủ dự án cung cấp |  |  |  |  |  |  |

| Loại phụ thu | Điều kiện áp dụng | Số tiền VND | Theo đêm/lần/người | Có chịu thuế/phí không |
|---|---|---:|---|---|
| Cần chủ dự án cung cấp |  |  |  |  |

Quyết định bắt buộc:

- Giá đã bao gồm thuế/phí chưa?
- Chính sách cọc phòng: phần trăm hay số tiền cố định; mức cụ thể; có yêu cầu thanh toán toàn bộ trong trường hợp nào?
- Chính sách cọc BBQ: phần trăm hay số tiền cố định; mức cụ thể.
- Số phút giữ chỗ production trước khi thanh toán hết hạn. Tài liệu kỹ thuật có mốc 15 phút nhưng vẫn cần chủ dự án xác nhận production.
- Quy tắc làm tròn và xử lý tổng tiền thấp hơn mức cọc cố định.
- Có mã giảm giá trong đợt mở bán đầu tiên không? Nếu có, cần phạm vi và giới hạn được duyệt.

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

| Mã combo | Tên | Số người đề xuất | Thành phần | Giá VND | Có cho chỉnh món | Trạng thái mở bán |
|---|---|---:|---|---:|---|---|
| Cần chủ dự án cung cấp |  |  |  |  |  |  |

Quyết định bổ sung: quy tắc ghép bàn, giới hạn đặt trước, mức cọc, phụ thu quá giờ và chính sách khách không đến.

## 8. PRE-005 — Chính sách vận hành và tài chính

**Trạng thái:** Chờ dữ liệu
**Owner:** Chủ dự án
**Người duyệt:** Chưa xác định
**Ngày duyệt:** Chưa xác định

### Lưu trú

| Nội dung | Quyết định cần duyệt |
|---|---|
| Giờ check-in | Cần chủ dự án cung cấp |
| Giờ check-out | Cần chủ dự án cung cấp |
| Check-in sớm/check-out muộn | Điều kiện và phụ thu |
| Chính sách trẻ em | Độ tuổi, miễn phí/phụ thu, sức chứa |
| Hủy booking | Các mốc thời gian và số tiền/tỷ lệ được giữ lại |
| Đổi lịch | Số lần, thời hạn báo trước, chênh lệch giá |
| No-show | Trạng thái booking và xử lý tiền đã thu |
| Hoàn tiền | Điều kiện, người phê duyệt, SLA xử lý |

### BBQ

| Nội dung | Quyết định cần duyệt |
|---|---|
| Hủy/đổi lịch | Các mốc thời gian và số tiền/tỷ lệ được giữ lại |
| No-show | Xử lý tiền cọc và tài nguyên bàn |
| Đến muộn | Thời gian giữ bàn và ảnh hưởng thời lượng sử dụng |
| Hoàn cọc | Điều kiện, người phê duyệt, SLA xử lý |

### Kế toán/đối soát

- Quy tắc hóa đơn và thời điểm xuất hóa đơn.
- Người được phép xác nhận điều chỉnh tài chính.
- Quy trình giao dịch thiếu, thừa, sai nội dung hoặc đến muộn.
- Chính sách lưu trữ chứng từ và dữ liệu thanh toán.
- Phase 1 không tự động hoàn tiền; mọi refund cần thao tác có audit và lý do.

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

### Hạng mục vẫn cần chủ dự án xác nhận/cung cấp

1. Cung cấp hoặc tạm hoãn các link pháp lý và CTA/đích đến ngoài hotline, email, Maps và social URL đã duyệt; không tự tạo link không có trang đích.
2. Cung cấp ảnh không gian/phòng/BBQ có quyền sử dụng trước khi thêm ảnh venue vào website.

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
