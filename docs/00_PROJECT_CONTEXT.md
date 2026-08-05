# Project Context — Vườn Măng Đen

## 1. Thông tin tài liệu

| Thuộc tính | Giá trị |
|---|---|
| Tên dự án | Vườn Măng Đen – Homestay & BBQ |
| Loại sản phẩm | Website responsive, mobile-first; nền tảng số phục vụ lưu trú, BBQ và du lịch Măng Đen |
| Giai đoạn hiện tại | Chuẩn bị triển khai Phase 1 |
| Trạng thái dự án thực tế khi bắt đầu lập kế hoạch | Đang setup, khoảng 30% tiến độ |
| Ngôn ngữ MVP | Tiếng Việt |
| Phiên bản tài liệu | 1.0 |
| Trạng thái | Working baseline |

Tài liệu này cung cấp bối cảnh chung cho AI coding và đội phát triển. Tài liệu không thay thế PRD, Master Technical Architecture hoặc Tech Spec.

## 2. Bối cảnh dự án

Vườn Măng Đen là mô hình kết hợp:

- Dịch vụ lưu trú.
- Nhà hàng nướng BBQ sân vườn.
- Trải nghiệm không gian rừng thông.
- Nội dung hướng dẫn và khám phá du lịch Măng Đen.
- Hệ thống đặt dịch vụ và chăm sóc khách hàng tự động.

Website cần được triển khai trong lúc địa điểm thực tế vẫn đang được setup. Mục tiêu là đưa kênh số vào hoạt động trước thời điểm khai trương để bắt đầu giới thiệu dự án, thu hút khách, thu thập dữ liệu và nhận booking sớm.

Về dài hạn, sản phẩm không chỉ là website giới thiệu homestay. Định hướng đã thống nhất là phát triển thành một nền tảng du lịch thông minh về Măng Đen, trong đó Vườn Măng Đen – Homestay & BBQ là dịch vụ và điểm xuất phát trung tâm.

## 3. Tầm nhìn sản phẩm

Tạo một hành trình số liền mạch để người dùng có thể:

1. Tìm thấy nội dung hữu ích về Măng Đen qua tìm kiếm và mạng xã hội.
2. Khám phá địa điểm, ẩm thực, cà phê, cẩm nang và lịch trình.
3. Chọn và đặt dịch vụ lưu trú hoặc BBQ tại Vườn Măng Đen.
4. Thanh toán, nhận xác nhận và được nhắc lịch tự động.
5. Chuẩn bị chuyến đi tốt hơn nhờ dữ liệu và gợi ý phù hợp.
6. Quay lại sử dụng voucher, dịch vụ, nội dung hoặc các sản phẩm mở rộng trong tương lai.

Hành trình dài hạn mong muốn:

```text
Tìm kiếm nội dung Măng Đen
→ Đọc blog/cẩm nang
→ Khám phá địa điểm hoặc lịch trình
→ Đặt Homestay
→ Đặt BBQ và dịch vụ bổ sung
→ Nhận chăm sóc trước/sau chuyến đi
→ Quay lại hoặc giới thiệu cho người khác
```

## 4. Vấn đề cần giải quyết

### 4.1 Đối với khách hàng

- Không biết phòng hoặc bàn BBQ còn trống hay không.
- Phải nhắn tin nhiều lần để hỏi giá và xác nhận.
- Không rõ booking đã được giữ hay chưa.
- Không biết số tiền cần đặt cọc và số tiền còn lại.
- Thiếu xác nhận thanh toán minh bạch.
- Dễ quên lịch đặt phòng hoặc đặt bàn.
- Thiếu thông tin chuẩn bị trước khi đến Măng Đen.
- Khó đặt đồng thời phòng, BBQ và dịch vụ bổ sung.
- Thông tin du lịch Măng Đen phân tán, khó xây dựng lịch trình phù hợp.

### 4.2 Đối với đơn vị vận hành

- Booking đến từ nhiều kênh và phải xử lý thủ công.
- Có nguy cơ trùng lịch phòng hoặc trùng bàn.
- Khó theo dõi tiền cọc, số tiền còn lại và đối soát thanh toán.
- Nhân viên có thể quên xác nhận hoặc nhắc lịch cho khách.
- Dữ liệu khách hàng không tập trung.
- Khó đo nguồn khách và hiệu quả marketing.
- Nội dung, giá, phòng, bàn và chính sách khó quản lý nhất quán nếu không có hệ thống trung tâm.

## 5. Mục tiêu kinh doanh

- Hình thành kênh bán hàng trực tiếp, giảm phụ thuộc vào nền tảng trung gian.
- Cho phép khách hoàn tất booking mà không cần nhân viên hỗ trợ trong luồng tiêu chuẩn.
- Giảm thời gian và sai sót của quy trình booking thủ công.
- Hạn chế trùng phòng, trùng bàn và sai lệch thanh toán.
- Thu thập dữ liệu khách hàng ngay từ thời điểm mở bán.
- Xây dựng nền tảng SEO bền vững về du lịch Măng Đen.
- Tạo cơ sở dữ liệu ban đầu cho CRM, marketing automation và AI ở các phase sau.
- Mở rộng nguồn doanh thu trong tương lai từ dịch vụ, tour, đặc sản và đối tác địa phương.

## 6. Mục tiêu sản phẩm Phase 1

Phase 1 xây dựng nền móng vận hành số và phải giúp khách:

1. Tìm hiểu về Vườn Măng Đen.
2. Xem phòng và bàn BBQ còn trống.
3. Đặt phòng hoặc đặt bàn.
4. Thanh toán tiền cọc hoặc toàn bộ theo chính sách được cấu hình qua SePay.
5. Nhận xác nhận qua email và Zalo.
6. Nhận nhắc lịch tự động trước ngày sử dụng dịch vụ.
7. Đọc nội dung giới thiệu, blog và kinh nghiệm du lịch Măng Đen.
8. Tra cứu thông tin booking sau khi đặt.

Hệ thống quản trị phải giúp nhân sự vận hành quản lý được phòng, bàn BBQ, booking, thanh toán, khách hàng, nội dung, giá, chính sách, phân quyền và báo cáo cơ bản mà không cần can thiệp kỹ thuật thường xuyên.

## 7. Phạm vi sản phẩm theo giai đoạn

### Phase 1 — MVP Booking và vận hành nền tảng

- Homepage và trang giới thiệu.
- Danh sách/chi tiết phòng, tồn phòng và đặt phòng.
- Không gian, menu/combo, tồn bàn và đặt BBQ.
- Giỏ dịch vụ hoặc bước tổng hợp dịch vụ trong luồng checkout.
- Thanh toán và xác nhận qua SePay.
- Email, Zalo và nhắc lịch T-7, T-3, T-1.
- Blog Măng Đen.
- Liên hệ, chính sách, điều khoản và tra cứu booking.
- Dashboard quản trị, phân quyền, audit và báo cáo cơ bản.

### Phase 2 — Content, CRM và bản đồ

- Cẩm nang chụp ảnh và cẩm nang du lịch.
- Trang địa điểm và bản đồ Măng Đen tương tác.
- Danh sách yêu thích.
- CRM khách hàng và phân nhóm.
- Marketing automation và voucher nâng cao.
- Đánh giá/phản hồi và theo dõi hành vi.
- Kho dữ liệu có cấu trúc phục vụ AI.

### Phase 3 — AI và thành viên

- AI Trip Planner tạo lịch trình theo thời gian, sở thích và điều kiện chuyến đi.
- AI Concierge chuyên về Măng Đen.
- Tài khoản thành viên.
- Lịch trình, nội dung và địa điểm đã lưu.
- Loyalty/điểm thưởng và trải nghiệm cá nhân hóa.
- Hệ thống đánh giá mở rộng.

### Phase 4 — Marketplace và hệ sinh thái

- Marketplace đặc sản và quà tặng.
- Tour và dịch vụ của đối tác địa phương.
- Quản lý nhà cung cấp/đối tác.
- Đơn hàng đa loại dịch vụ và mở rộng hệ sinh thái.
- Các tính năng cộng đồng và ứng dụng di động khi có quyết định riêng.

## 8. Nhóm người dùng chính

### Khách đặt phòng

Cá nhân, cặp đôi, gia đình hoặc nhóm bạn; chủ yếu sử dụng điện thoại; cần biết phòng, giá, sức chứa, tiện nghi, chính sách và dịch vụ bổ sung.

### Khách đặt BBQ

Có thể lưu trú hoặc không lưu trú; thường đi theo nhóm; cần chọn ngày, khung giờ, số người, bàn/khu vực, combo và tiền cọc.

### Nhân viên lễ tân/vận hành

Cần xem booking theo ngày, liên hệ khách, ghi nhận yêu cầu đặc biệt và cập nhật check-in/check-out.

### Kế toán

Cần theo dõi giao dịch, tiền cọc, số tiền còn lại, sai lệch và đối soát thanh toán.

### Marketing/biên tập nội dung

Cần quản lý nội dung website và blog, SEO metadata, hình ảnh và các CTA chuyển đổi.

### Quản lý

Cần xem công suất phòng, booking sắp đến, bàn BBQ, doanh thu, tiền cọc và xử lý các trường hợp đổi/hủy/đối soát.

### Quản trị viên hệ thống

Cần quản lý tài khoản, vai trò, quyền, cấu hình tích hợp, audit log và lỗi đồng bộ/thông báo.

## 9. Các luồng nghiệp vụ cốt lõi Phase 1

### Đặt phòng

```text
Chọn ngày và số khách
→ Xem loại phòng còn trống
→ Chọn phòng và dịch vụ bổ sung
→ Nhập thông tin khách
→ Xem lại giá và chính sách
→ Tạo booking/giữ chỗ
→ Thanh toán
→ Hệ thống xác nhận
→ Gửi email và Zalo
→ Gửi nhắc lịch trước check-in
```

### Đặt BBQ

```text
Chọn ngày, khung giờ và số khách
→ Xem lựa chọn còn trống
→ Chọn khu vực/bàn và combo
→ Nhập thông tin khách
→ Xem lại giá và chính sách
→ Tạo booking/giữ chỗ
→ Thanh toán cọc
→ Xác nhận và gửi thông báo
```

### Nhắc lịch

- T-7: nhắc booking và thông tin chính.
- T-3: nhắc lại lịch, xác nhận kế hoạch và thông tin cần thiết.
- T-1: gửi lưu ý chuẩn bị cho chuyến đi, ví dụ áo lạnh, thuốc chống côn trùng, sạc dự phòng và các nội dung đã được vận hành phê duyệt.

Nội dung cụ thể của email/Zalo là dữ liệu vận hành cần được chốt, không để AI tự soạn rồi phát hành production.

## 10. Chỉ số thành công ban đầu

Các mục tiêu đã nêu trong PRD Phase 1:

- Tỷ lệ hoàn tất booking từ bước chọn dịch vụ đến thanh toán: từ 20% trở lên.
- 100% giao dịch SePay hợp lệ được gắn đúng booking.
- Không phát sinh booking phòng trùng ngày.
- Tỷ lệ gửi email xác nhận thành công: từ 98% trở lên.
- Tỷ lệ gửi thông báo nhắc lịch thành công: từ 95% trở lên.
- Thời gian tải trang chính trên điện thoại: dưới 3 giây trong điều kiện mạng phổ biến.
- Quản lý tra cứu được booking trong tối đa 30 giây.

Các chỉ số này cần được xác nhận lại trước go-live dựa trên hạ tầng, provider và dữ liệu thực tế.

## 11. Nguyên tắc sản phẩm và kỹ thuật đã thống nhất

- Mobile-first; trải nghiệm đặt dịch vụ phải rõ ràng trên điện thoại.
- PostgreSQL là nguồn dữ liệu nghiệp vụ chuẩn.
- Kiến trúc Phase 1 là Modular Monolith, không tự tách microservice.
- Booking, payment và admin phải đi qua backend API; không tin dữ liệu do frontend quyết định.
- Chống trùng tài nguyên bằng transaction và database constraint.
- Booking/payment/webhook phải idempotent.
- Notification chạy qua queue; lỗi gửi không rollback booking hợp lệ.
- Mọi hành động quản trị quan trọng phải xác thực, phân quyền và ghi audit.
- Giá và chính sách tại thời điểm đặt phải được snapshot.
- Tất cả phase sau phải được dự phòng ở mức mô hình dữ liệu và ranh giới module hợp lý, nhưng không triển khai sớm chức năng ngoài Phase 1.
- Bảo mật áp dụng từ đầu; OWASP ASVS Level 2 là baseline kiểm thử trước production.

## 12. Nội dung ngoài phạm vi Phase 1

- Bản đồ du lịch tương tác.
- AI tự động xây dựng lịch trình.
- AI Concierge/chatbot chuyên về Măng Đen.
- Tài khoản thành viên đầy đủ, điểm thưởng và loyalty.
- Marketplace đặc sản và bán tour đối tác.
- Đánh giá địa điểm du lịch mở rộng.
- Ứng dụng di động.
- Quản lý đối tác bên thứ ba.
- Đồng bộ OTA như Booking.com hoặc Agoda.
- Dynamic pricing và tối ưu giá tự động nâng cao.

Không được kéo các chức năng này vào Phase 1 nếu chưa có quyết định thay đổi phạm vi.

## 13. Dữ liệu và tài nguyên cần chốt trước khi phát triển nghiệp vụ

- Logo, bộ màu thương hiệu và font chữ.
- Domain và thông tin pháp nhân hiển thị trên website.
- Tài khoản ngân hàng nhận tiền, tài khoản SePay và quy tắc đối soát.
- Email tên miền và kênh Zalo dùng để gửi thông báo.
- Danh sách loại phòng và từng phòng thực tế.
- Mã phòng, sức chứa, cấu hình giường, tiện nghi và hình ảnh.
- Giá phòng, giá theo ngày/giai đoạn, phụ thu và tiền cọc.
- Chính sách trẻ em, nhận/trả phòng, hủy, đổi lịch và hoàn tiền.
- Khu vực, bàn, khung giờ, sức chứa, menu và combo BBQ.
- Danh sách dịch vụ bổ sung và trạng thái sẵn sàng vận hành.
- Nội dung website, blog, chính sách, điều khoản và thông báo T-7/T-3/T-1.
- Hotline và người chịu trách nhiệm booking, vận hành, nội dung và đối soát.
- Vai trò và quyền chi tiết của từng nhóm nhân sự.

## 14. Các nội dung chưa được phép tự giả định

Những nội dung sau hiện phải lấy từ tài liệu đã duyệt hoặc được chủ dự án xác nhận:

- Giá, thuế, phí, phụ thu và số tiền/tỷ lệ đặt cọc.
- Khoảng thời gian giữ chỗ production.
- Chính sách hủy, đổi lịch và hoàn tiền.
- Thông tin pháp nhân, tài khoản ngân hàng và cấu hình provider.
- Danh sách phòng, bàn, khung giờ, menu và combo thực tế.
- Vai trò, quyền hạn và quy trình phê duyệt tài chính.
- Nội dung email/Zalo và lịch gửi cuối cùng.
- Quy tắc hóa đơn, kế toán và lưu trữ dữ liệu.

Nếu thiếu, AI phải dừng task liên quan và đặt câu hỏi cụ thể.

## 15. Ràng buộc và rủi ro chính

- Dự án thực tế còn đang setup nên dữ liệu phòng, giá, ảnh và quy trình có thể thay đổi.
- Tích hợp SePay, email và Zalo phụ thuộc tài khoản, quyền truy cập và quy định của provider.
- Booking đồng thời có rủi ro double-booking nếu chỉ kiểm tra ở frontend hoặc dùng cache/lock không có constraint database.
- Thanh toán có thể đến trễ, trùng, thiếu/thừa tiền hoặc sai nội dung; cần reconciliation thủ công.
- Notification có thể thất bại hoặc gửi trùng; cần queue, retry và deduplication.
- Nội dung du lịch có thể lỗi thời; các phase sau cần nguồn, ngày cập nhật và người chịu trách nhiệm.
- Việc triển khai quá nhiều phase cùng lúc sẽ làm chậm go-live và tăng rủi ro; Phase 1 phải giữ đúng phạm vi MVP.

## 16. Tiêu chí hoàn thành cấp dự án cho Phase 1

Phase 1 được xem là hoàn thành khi tối thiểu:

1. Khách đặt phòng từ đầu đến cuối trên mobile.
2. Khách đặt BBQ và thanh toán cọc theo chính sách.
3. Hệ thống không cho phép trùng tồn phòng/bàn.
4. Giao dịch SePay hợp lệ được xác nhận tự động và giao dịch bất thường vào đối soát.
5. Email xác nhận hoạt động và có khả năng gửi xác nhận qua Zalo.
6. Nhắc lịch T-7, T-3 và T-1 hoạt động đúng.
7. Quản lý xem được booking trên lịch; lễ tân cập nhật check-in/check-out.
8. Kế toán đối soát được thanh toán.
9. Marketing đăng và sửa bài blog/nội dung được.
10. Website đáp ứng mobile, SEO cơ bản và baseline bảo mật.
11. Có backup, monitoring, audit log và tài liệu hướng dẫn vận hành.

## 17. Quan hệ với các tài liệu khác

| Tài liệu | Vai trò |
|---|---|
| `00_PROJECT_CONTEXT.md` | Bối cảnh, tầm nhìn, phạm vi phase và các ràng buộc chung |
| `01_PRD_PHASE_01.md` | Yêu cầu sản phẩm và tiêu chí nghiệm thu Phase 1 |
| `02_MASTER_TECHNICAL_ARCHITECTURE.md` | Kiến trúc toàn hệ thống và khả năng mở rộng qua các phase |
| `03_TECHSPEC_PHASE_01.md` | Thiết kế kỹ thuật chi tiết để triển khai Phase 1 |
| `04_AI_CODING_EXECUTION_PLAN_PHASE_01.md` | Trình tự milestone/task cho AI coding |
| `05_SECURITY_BASELINE_PHASE_01.md` | Các kiểm soát bảo mật bắt buộc |
| `06_AI_TASK_TEMPLATE.md` | Mẫu giao từng task độc lập cho AI |
| `docs/tasks/<TASK-ID>.md` | Yêu cầu thực thi cụ thể của từng task |

Khi có mâu thuẫn, áp dụng thứ tự ưu tiên được quy định trong `AGENTS.md`. Lịch sử chat không phải nguồn yêu cầu chuẩn sau khi nội dung đã được đưa vào tài liệu repository.

## 18. Thuật ngữ

- **VMD:** Vườn Măng Đen.
- **Phase 1/MVP:** Phiên bản đầu tiên phục vụ website, booking, payment, notification, nội dung và quản trị cơ bản.
- **Booking phòng:** Đặt dịch vụ lưu trú.
- **Booking BBQ:** Đặt bàn/khu vực/khung giờ và món/combo BBQ.
- **Hold:** Giữ tài nguyên tạm thời trong thời gian giới hạn để khách hoàn tất đặt dịch vụ.
- **Occupancy:** Dữ liệu tài nguyên đã được giữ hoặc phân bổ theo ngày/khung giờ.
- **Reconciliation:** Quy trình đối soát và xử lý giao dịch không thể tự động ghép chính xác.
- **T-7/T-3/T-1:** Thời điểm gửi thông báo trước ngày check-in/sử dụng dịch vụ 7, 3 và 1 ngày.
- **Source of truth:** Nguồn dữ liệu hoặc tài liệu chuẩn được dùng để ra quyết định.

## 19. Lịch sử thay đổi

| Phiên bản | Nội dung |
|---|---|
| 1.0 | Tổng hợp bối cảnh dự án từ trao đổi ban đầu, PRD Phase 1 và định hướng sản phẩm 4 phase |
