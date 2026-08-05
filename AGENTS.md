# Vườn Măng Đen — Phase 1 Mandatory Coding Rules

Các quy tắc trong tài liệu này là bắt buộc. AI coding không được thay đổi, bỏ qua hoặc diễn giải lại nếu chưa có phê duyệt của chủ dự án.

## 1. Nguồn yêu cầu chuẩn

Trước khi thực hiện bất kỳ task nào, phải đọc theo thứ tự:

1. `docs/00_PROJECT_CONTEXT.md`
2. `docs/01_PRD_PHASE_01.md`
3. `docs/02_MASTER_TECHNICAL_ARCHITECTURE.md`
4. `docs/03_TECHSPEC_PHASE_01.md`
5. File task tương ứng trong `docs/tasks/`

Thứ tự ưu tiên khi có mâu thuẫn: task hiện tại → Tech Spec Phase 1 → Master Technical Architecture → PRD Phase 1 → code hiện tại. Không tự bổ sung nghiệp vụ chưa có trong tài liệu.

## 2. Phạm vi công việc

- Mỗi lần chỉ thực hiện một Task ID.
- Không sửa module ngoài phạm vi task nếu không thật sự cần thiết.
- Nếu cần sửa ngoài phạm vi, phải dừng và báo file cần sửa, lý do, ảnh hưởng và phương án thay thế.
- Không tự tái cấu trúc toàn bộ repository.
- Không đổi kiến trúc Modular Monolith; không tách microservice.
- Không thay công nghệ đã chốt.
- Không thêm dependency mới nếu chưa nêu rõ lý do và được phê duyệt.
- Không nâng major version dependency trong task chức năng.

## 3. Quy tắc Git

- Một task tương ứng một branch; không code trực tiếp trên `main`.
- Không force-push `main`, không xóa lịch sử Git.
- Không gộp nhiều chức năng không liên quan trong một commit.
- Không merge khi test chưa đạt.
- Mỗi Pull Request phải có: Task ID, mục tiêu, danh sách file thay đổi, migration, test đã chạy, rủi ro bảo mật, ảnh/video kiểm thử UI nếu có.

## 4. Database

- PostgreSQL là nguồn dữ liệu chuẩn; mọi thay đổi schema phải qua migration.
- Không sửa database production trực tiếp; không dùng `db push` cho production.
- Không drop bảng, truncate dữ liệu hoặc reset database khi chưa được phê duyệt.
- Không sửa migration đã chạy.
- Tiền lưu bằng số nguyên VND; không dùng float cho tiền.
- ID sử dụng UUID; timestamp lưu UTC; ngày vận hành hiển thị theo `Asia/Ho_Chi_Minh`.
- Không dùng Redis làm nguồn dữ liệu duy nhất cho booking hoặc payment.
- Không bỏ unique constraint để làm test chạy qua.

## 5. Truy cập dữ liệu

- Public Web và Admin Web không được truy cập trực tiếp dữ liệu nghiệp vụ booking, payment hoặc admin từ trình duyệt.
- Mọi nghiệp vụ quan trọng phải đi qua NestJS API.
- Không bao giờ đưa Supabase Service Role Key hoặc database connection string vào frontend.
- Bảng trong schema có thể truy cập từ client bắt buộc bật RLS và có policy cụ thể.
- Backend luôn phải kiểm tra authorization; không chỉ dựa vào giao diện hoặc RLS.

## 6. Authentication và Authorization

- Mọi endpoint admin phải xác thực; mọi quyền phải kiểm tra phía server.
- Không tin role, user ID hoặc permission do frontend gửi lên.
- Không chỉ ẩn nút trên giao diện để bảo vệ chức năng.
- Mặc định từ chối nếu chưa xác định được quyền.
- MFA bắt buộc cho Super Admin và Accountant ở production.
- Không lưu mật khẩu dạng rõ; không log access token, refresh token hoặc OTP.

## 7. Input và Output

- Mọi input bên ngoài phải được validate ở backend; frontend validation chỉ phục vụ trải nghiệm.
- Không ghép SQL từ chuỗi input; không render HTML chưa sanitize.
- File upload phải kiểm tra MIME type, phần mở rộng, kích thước và quyền upload.
- Error trả cho người dùng không được chứa stack trace, SQL hoặc secret.
- Error nội bộ phải có correlation ID.

## 8. Booking và BBQ

- Không xác nhận booking nếu chưa đủ điều kiện trạng thái.
- Chống trùng phòng phải dựa trên transaction và database constraint; Redis lock không thay thế database constraint.
- Tạo booking bắt buộc có `Idempotency-Key`.
- Hold phải có thời gian hết hạn; hold hết hạn phải giải phóng tài nguyên.
- Hủy hoặc đổi lịch phải cập nhật occupancy trong cùng transaction.
- Mọi thay đổi trạng thái phải ghi status history.
- Không sửa trực tiếp status trong controller.

## 9. Thanh toán

- Webhook SePay phải xác thực; raw webhook phải được lưu trước khi xử lý nghiệp vụ.
- Webhook phải idempotent; một provider transaction ID chỉ được ghi nhận một lần.
- Không xác nhận thanh toán chỉ vì người dùng bấm “Tôi đã chuyển khoản”.
- Thiếu tiền, thừa tiền, sai nội dung và thanh toán muộn phải tạo reconciliation case.
- Không tự động hoàn tiền trong Phase 1.
- Mọi điều chỉnh tài chính phải có audit log và lý do.
- Không log đầy đủ tài khoản ngân hàng hoặc dữ liệu nhạy cảm.

## 10. Notification

- Không gửi email hoặc Zalo trong transaction booking; phải gửi qua queue.
- Mọi notification phải có deduplication key.
- Lỗi email hoặc Zalo không được rollback booking đã hợp lệ.
- Booking hủy không được nhận reminder.
- Booking đổi ngày phải hủy reminder cũ và tạo reminder mới.
- Worker phải kiểm tra lại trạng thái booking trước khi gửi.

## 11. Bảo mật

Không được: tắt RLS hoặc SSL; dùng CORS `*` ở production; tắt kiểm tra webhook; hard-code secret; commit `.env` hay private key; log password/token/OTP/secret; bỏ rate limiting hoặc authorization để test chạy; dùng `dangerouslySetInnerHTML` với dữ liệu chưa sanitize; dùng `eval`; chạy câu lệnh phá hủy production.

Bắt buộc: secure headers, CSP, rate limiting, audit logging, server-side authorization, input validation, secret scanning, dependency scanning và security test trước production.

## 12. Logging và Audit

- Mọi request có correlation ID; log dạng structured JSON.
- Không log PII đầy đủ.
- Authentication failure, authorization failure và webhook failure phải được log.
- Thay đổi booking và tài chính phải có audit.
- Không được xóa hoặc sửa audit log bằng chức năng thông thường.

## 13. Tests

Mỗi task phải có test phù hợp: unit test cho business logic; integration test cho database, queue hoặc provider adapter; E2E cho luồng quan trọng; security test nếu liên quan auth, input, upload hoặc payment.

Không được xóa test đang chạy, skip test lỗi mà không giải thích, mock toàn bộ business logic để tạo cảm giác test đạt hoặc chỉ test happy path.

## 14. Chất lượng code

- Không để TODO trong luồng production nếu task được tuyên bố hoàn thành.
- Không để mock data trong production; không tạo duplicate business logic.
- Controller phải mỏng; business logic nằm trong service/domain; provider bên ngoài phải qua adapter.
- Không swallow exception hoặc catch lỗi rồi bỏ qua.
- Không dùng `any` nếu có thể định nghĩa type.
- Không tạo file quá lớn khi có thể tách hợp lý.
- Không tối ưu quá sớm nhưng không bỏ qua index và constraint bắt buộc.

## 15. Definition of Done

Task chỉ hoàn thành khi: code đã triển khai; lint, type check, unit test và integration test liên quan đều đạt; migration hợp lệ; OpenAPI được cập nhật; permission được kiểm tra; audit được thêm nếu cần; UI có loading/empty/error state và đã kiểm tra mobile; không còn secret hoặc mock production; đã báo cáo file thay đổi, hướng dẫn kiểm thử thủ công và rủi ro còn lại.

## 16. Khi gặp thiếu thông tin

Không tự đoán giá, chính sách cọc/hủy, quyền người dùng, tài khoản ngân hàng, nội dung Zalo, quy tắc kế toán, dữ liệu phòng hoặc bàn. Phải dừng và đặt câu hỏi cụ thể.

## 17. Báo cáo cuối task

Sau mỗi task phải trả: đã thực hiện gì; file đã thay đổi; migration đã tạo; API đã thêm/thay đổi; test đã chạy và kết quả; cách kiểm thử thủ công; ảnh hưởng bảo mật; rủi ro hoặc nội dung chưa hoàn thành.
