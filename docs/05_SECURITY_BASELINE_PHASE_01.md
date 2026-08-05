# Security Baseline — Vườn Măng Đen Phase 1

## 1. Mục tiêu và chuẩn áp dụng

- Lấy OWASP ASVS Level 2 làm baseline kiểm thử trước production.
- Phòng thủ nhiều lớp: trình duyệt, API, database, queue, storage và nhà cung cấp ngoài.
- Nguyên tắc deny-by-default, least privilege, fail securely và không tin dữ liệu từ client.
- Security controls là tiêu chí nghiệm thu, không phải công việc bổ sung cuối dự án.

## 2. Quản lý secret và môi trường

- Secret chỉ lưu trong secret manager hoặc biến môi trường của nền tảng triển khai.
- Có `.env.example` chỉ chứa tên biến và giá trị giả an toàn.
- Tách hoàn toàn local, staging và production; không dùng chung key, database, bucket hoặc webhook secret.
- Service Role Key, database URL, SMTP credential, SePay/Zalo secret chỉ tồn tại phía server.
- Bật secret scanning trong CI; rotate ngay khi có dấu hiệu lộ.
- Không đưa secret vào log, ảnh chụp, issue, prompt AI hoặc dữ liệu test.

## 3. Authentication và session

- Dùng Supabase Auth cho staff; kiểm tra token tại API.
- Cookie nếu sử dụng phải `HttpOnly`, `Secure`, `SameSite` phù hợp.
- Token ngắn hạn; refresh/session revocation hoạt động khi logout hoặc khóa tài khoản.
- MFA bắt buộc cho Super Admin và Accountant ở production.
- Rate limit đăng nhập, lockout có thời hạn và audit thất bại đăng nhập.
- Không tiết lộ tài khoản có tồn tại qua thông báo lỗi.

## 4. Authorization và RBAC

- Permission được kiểm tra phía server ở từng hành động, không chỉ route hoặc UI.
- Role/permission lấy từ nguồn tin cậy phía server; không nhận từ payload client.
- Tách quyền xem, tạo, sửa, hủy, xuất dữ liệu, điều chỉnh tài chính và xem audit.
- Các thao tác nhạy cảm yêu cầu quyền cụ thể; mặc định từ chối.
- Có test ma trận role × endpoint và test chống IDOR/BOLA.

## 5. Database, Supabase và RLS

- RLS bật cho mọi bảng trong schema được expose ra client; policy cụ thể, không policy rộng mặc định.
- Bảng nghiệp vụ nhạy cảm chỉ truy cập qua API khi có thể.
- Dùng ORM/parameterized query; không nối chuỗi SQL.
- Migration được review; production không dùng `db push`.
- Backup tự động, point-in-time recovery nếu gói hỗ trợ; diễn tập restore trước go-live.
- Encrypt in transit; giới hạn network và connection pool.
- Unique constraint, foreign key, check constraint và transaction bảo vệ invariant nghiệp vụ.

## 6. Validation, encoding và upload

- DTO/schema validate tất cả body, query, params và header nghiệp vụ; reject field lạ khi thích hợp.
- Giới hạn độ dài, kiểu, miền giá trị và kích thước request.
- Encode output theo context; sanitize rich text bằng allowlist.
- Không dùng `eval`; không render HTML không tin cậy.
- Upload kiểm tra quyền, MIME thực, extension, magic bytes, kích thước và tên file sinh bởi server.
- Lưu upload ngoài vùng thực thi; bucket public/private rõ ràng; dùng signed URL ngắn hạn cho file riêng tư.
- Cân nhắc quét malware và xử lý ảnh lại phía server trước khi phát hành.

## 7. API và trình duyệt

- HTTPS bắt buộc; HSTS ở production.
- Secure headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`, frame protection và Permissions Policy.
- CORS dùng allowlist chính xác; không dùng `*` với credential.
- CSRF protection cho cơ chế xác thực dựa trên cookie.
- Rate limit theo IP, account và loại endpoint; chặt hơn cho auth, booking, contact và payment.
- Không trả stack trace, SQL, đường dẫn nội bộ hoặc secret; trả mã lỗi ổn định và correlation ID.
- OpenAPI không công khai endpoint nội bộ ngoài chủ đích.

## 8. Booking, tồn phòng và idempotency

- Tạo booking dùng `Idempotency-Key`; lưu fingerprint request và response kết quả.
- Allocation dựa trên transaction và unique `(room_id, stay_date)`.
- Hold có TTL, trạng thái rõ ràng và job giải phóng an toàn, có thể retry.
- Mọi chuyển trạng thái dùng state machine/service; ghi status history.
- Quote và price snapshot được lưu để không bị thay đổi ngầm sau khi đặt.
- Không tin tổng tiền, giá, room ID hay trạng thái do client gửi.

## 9. Payment và webhook SePay

- Endpoint webhook có secret/signature hoặc cơ chế xác minh chính thức; allowlist khi phù hợp.
- Lưu raw event cùng hash/metadata trước xử lý, nhưng mask dữ liệu nhạy cảm.
- Deduplicate bằng provider transaction ID và constraint database.
- Xử lý idempotent, có retry/backoff và dead-letter/reconciliation.
- Match theo mã booking, số tiền, thời hạn và trạng thái hiện tại.
- Thiếu/thừa/sai nội dung/muộn đưa vào reconciliation, không tự ép trạng thái.
- Không xác nhận theo thao tác client; không tự động refund Phase 1.
- Điều chỉnh tài chính cần quyền, lý do và immutable audit trail.

## 10. Queue, email và Zalo

- Dùng transactional outbox để không mất event sau commit.
- Job có deduplication key, retry có giới hạn, backoff và dead-letter handling.
- Worker kiểm tra trạng thái mới nhất trước gửi.
- Template không chèn dữ liệu chưa escape; link booking dùng token ngắn hạn, có scope và expiry.
- Hủy hoặc đổi booking phải hủy/lập lại reminder tương ứng.
- Không log toàn bộ nội dung nhạy cảm hay credential provider.

## 11. Logging, audit và privacy

- Structured log JSON, correlation ID xuyên suốt API → queue → worker.
- Mask email, điện thoại, tài khoản ngân hàng; không log password, OTP, token, cookie hoặc secret.
- Audit bắt buộc cho auth failure, permission failure, booking status, price/rate, payment, refund/reconciliation, role và setting.
- Audit chứa actor, action, object, before/after đã lọc, IP, timestamp và correlation ID.
- Audit không được sửa/xóa bằng luồng thông thường; retention và quyền xem được cấu hình.
- Chỉ thu thập PII cần thiết; có consent và chính sách lưu/xóa dữ liệu.

## 12. Dependency, CI/CD và supply chain

- Lockfile được commit; install deterministic.
- CI chạy lint, type check, test, build, migration validation, secret scan và dependency scan.
- Dependency mới cần lý do và review; không nâng major trong task chức năng.
- Build artifact một lần và promote; production deploy qua pipeline được kiểm soát.
- Branch protection và review bắt buộc; không dùng credential cá nhân dài hạn cho CI.
- Có rollback application; migration phá hủy cần kế hoạch riêng và phê duyệt.

## 13. Kiểm thử bảo mật bắt buộc

- Authentication/session: brute force, lockout, logout/revocation, token lỗi/hết hạn.
- Authorization: role matrix, truy cập chéo object, endpoint ẩn, mass assignment.
- Input: SQLi, XSS, path traversal, oversized payload và content-type sai.
- Booking: concurrent booking, replay idempotency, hold hết hạn, race khi hủy/đổi.
- Payment: webhook giả, replay, duplicate, sai tiền, sai mã và event đến sai thứ tự.
- Upload: file giả MIME, double extension, file quá lớn và truy cập file riêng tư.
- Headers/TLS/CORS/CSP được kiểm tra trên staging gần production.

## 14. Incident readiness và vận hành

- Alert cho auth spike, 403 spike, webhook failure, reconciliation tăng, queue backlog và lỗi 5xx.
- Runbook cho lộ secret, payment mismatch, database incident, queue outage và rollback deploy.
- Backup/restore được diễn tập; RPO/RTO được xác nhận trước go-live.
- Tài khoản admin định kỳ rà soát; khóa ngay tài khoản nghỉ việc.
- Có đầu mối xử lý sự cố và nhật ký quyết định.

## 15. Security gate trước production

- [ ] Không có secret trong repository hoặc bundle frontend.
- [ ] MFA và RBAC hoạt động; role matrix đạt.
- [ ] RLS/policy được rà soát; service-role không xuất hiện ở client.
- [ ] CORS, CSP, HTTPS, HSTS, secure cookie và rate limit đúng production.
- [ ] Booking concurrency/idempotency test đạt.
- [ ] Webhook authentication/replay/deduplication test đạt.
- [ ] Upload security test đạt.
- [ ] Dependency và secret scan không còn lỗi nghiêm trọng chưa chấp nhận.
- [ ] Backup restore đã thử; monitoring/alert và runbook sẵn sàng.
- [ ] Các ngoại lệ bảo mật có owner, thời hạn và phê duyệt bằng văn bản.
