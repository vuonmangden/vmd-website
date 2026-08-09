# LLM Council Transcript — Lộ trình tăng tốc Phase 1

**Thời gian:** 2026-08-09 17:35 Asia/Bangkok

## Câu hỏi gốc

Các task tiếp theo cần làm gì để đẩy nhanh tiến độ dự án?

## Câu hỏi đã đóng khung

Với dự án Vườn Măng Đen Phase 1 theo Modular Monolith, thứ tự task nào tối đa hóa tốc độ nhưng không vi phạm dependency và bảo mật? MNT-002 đang có draft PR; FND-003/FND-005/BKG-001/NTF-001 ở Review; local gate đạt nhưng GitHub-hosted CI và branch protection chưa xác minh. PRE-001–PRE-008 còn chờ dữ liệu thật. Chủ dự án cho phép synthetic data có nhãn và production guard cho local/dev/test/demo nội bộ, nhưng không đóng PRE/BLK. Tối đa 3 lane độc lập, worktree/branch riêng, không trùng file, migration sequence hoặc database verification.

## Advisor responses

### Contrarian

Không nên mở ngay 3 nhánh feature: đó là tiến độ giả vì backlog chưa đạt dependency. Hoàn tất MNT-002, GitHub CI, branch protection và merge nền tảng theo ancestry. Song song chỉ xử lý PRE thật, ưu tiên PRE-006/007 và PRE-001–005. IAM chỉ bắt đầu sau PRE thật; synthetic fixture phải là task độc lập. Sau đó đi IAM chain, RMS chain, Booking; Payment sau BKG-004 và security gates.

### First Principles Thinker

Nút thắt là nền tảng chưa merge. Sau baseline, ba lane leverage cao là IAM-001, CMS-005 với synthetic public demo, và NTF-002 qua Mailpit. Sau IAM-001 ưu tiên IAM-002, rồi IAM-003/IAM-004 và RMS-001 nếu đủ gate. Critical path booking: RMS-001 → RMS-002/RMS-003 → RMS-004/RMS-005/RMS-006 → BKG-002 → BKG-003 → BKG-004 → BKG-005.

### Expansionist

Đóng verification lane, rồi chạy IAM-001, CMS-005 và NTF-002 song song với ownership rõ. IAM mở khóa phần lớn Admin/CMS/Payment; CMS tạo demo nhìn thấy sớm; NTF tận dụng queue/outbox đã có. Business spine phải tuần tự ở migration/database lane. Không ưu tiên Blog, Reports, Ops hoặc Zalo.

### Outsider

Ưu tiên baseline có CI/protection. Mọi lane synthetic phải có task spec ghi production mặc định tắt. IAM nên tuần tự; CMS-005 và NTF-002 là hai lane ít xung đột. Sau IAM-002 dành riêng database verification cho RMS và Booking. Không ưu tiên Payment, BBQ, dashboard hoặc checkout UI trước booking core.

### Executor

Chốt MNT-002 và foundation; sau đó chạy IAM-001, CMS-005, NTF-002. Tiếp theo IAM-002 và booking vertical slice từ RMS đến BKG-005, rồi ghép RMS-007/BKG-006. Không chạy đồng thời task RMS/Booking/BBQ có migration hoặc chung database verification. Payment chỉ sau BKG-004 và IAM-005.

## Anonymization mapping

- Response A: Expansionist
- Response B: Contrarian
- Response C: Executor
- Response D: First Principles Thinker
- Response E: Outsider

## Peer reviews

### Reviewer 1

Response B mạnh nhất vì phân biệt synthetic fixture với PRE approval. Response A có blind spot lớn nhất vì giả định IAM/Booking có thể bắt đầu khi PRE còn mở. Tất cả thiếu readiness matrix gồm dependency evidence, PRE status, file/migration/DB ownership, worktree owner và required gates.

### Reviewer 2

Response B mạnh nhất vì ưu tiên MNT/CI/foundation và PRE thật. Response A biến synthetic thành điều kiện đủ. Tất cả thiếu merge-and-verification protocol cho bốn task Review, isolated DB scheduling và checkpoint chuyển dependency sang executable.

### Reviewer 3

Response B mạnh nhất vì tránh đẩy giả định vào schema và tài chính. Response A chi tiết nhưng rủi ro tái làm. Tất cả thiếu execution gate cho từng transition và quy tắc synthetic chỉ được mở implementation khi task spec cho phép.

### Reviewer 4

Response B mạnh nhất; fixture phải là task độc lập. Response A xem PRE/BLK như vấn đề lịch biểu. Tất cả chưa đặt MNT-002 mergeability và repository controls làm gate đầu tiên, cũng thiếu integration governance.

### Reviewer 5

Response B mạnh nhất vì tách lane reservation khỏi permission to implement. Response A mở feature quá sớm. Tất cả thiếu evidence cho MNT-002, task ID riêng cho fixture, acceptance criteria, production fail-closed và isolated verification database.

## Chairman synthesis

### Where the Council Agrees

- Không phát triển phụ thuộc trên baseline chưa merge/chưa verify.
- Synthetic chỉ dùng non-production và không đóng PRE/BLK.
- Sau baseline, ba lane tốt nhất là IAM-001, CMS-005 và NTF-002 nếu dependency riêng đã đạt.
- IAM, migration và database verification cần tuần tự phù hợp; Payment đi sau Booking và security.

### Where the Council Clashes

Expansionist muốn bắt đầu ba lane ngay; Contrarian yêu cầu dependency thật. Kết luận: được reserve và planning ngay, nhưng implementation chỉ khi row dependency của task xanh. Synthetic không được bypass prerequisite thật.

### Blind Spots the Council Caught

Cần readiness matrix ghi dependency evidence, PRE real/synthetic status, implementation permission, branch/worktree/owner, file scope, migration owner, database environment, gates, merge order, rollback và production guard. Cần task độc lập cho synthetic fixtures.

### The Recommendation

1. Làm MNT-002 PR #1 mergeable, chạy GitHub-hosted CI, cấu hình branch protection và đóng review FND-003/FND-005/BKG-001/NTF-001.
2. Tạo readiness matrix và task fixture giả lập độc lập; song song thu thập PRE thật, ưu tiên PRE-006/007.
3. Khi từng gate đạt, mở tối đa ba lane IAM-001, CMS-005, NTF-002.
4. Tiếp IAM chain, RMS/Booking spine; trì hoãn Payment và tài chính.

### The One Thing to Do First

Làm MNT-002 PR #1 mergeable bằng GitHub-hosted CI và branch protection, sau đó đóng foundation review gates.
