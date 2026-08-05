# AI Task Template — Vườn Măng Đen Phase 1

> Sao chép file này thành `docs/tasks/<TASK-ID>.md`. Mỗi phiên AI coding chỉ nhận đúng một task đã được điền đủ.

## 1. Thông tin task

- **Task ID:** `<MODULE-NNN>`
- **Tên task:** `<Tên ngắn gọn>`
- **Milestone:** `<Milestone N>`
- **Mức ưu tiên:** `<P0/P1/P2>`
- **Trạng thái:** `Ready | In progress | Blocked | Review | Done`
- **Phụ thuộc:** `<Task IDs hoặc None>`
- **Branch:** `<type>/<task-id>-<slug>`

## 2. Bối cảnh

Mô tả vấn đề, người dùng bị ảnh hưởng và lý do task cần tồn tại. Dẫn chiếu đúng mục trong PRD/Tech Spec; không chép thêm nghiệp vụ chưa duyệt.

## 3. Mục tiêu

- `<Kết quả đo được 1>`
- `<Kết quả đo được 2>`

## 4. Ngoài phạm vi

- `<Nội dung không được làm trong task>`
- `<Nội dung để task khác xử lý>`

## 5. Tài liệu bắt buộc phải đọc

- `AGENTS.md`
- `docs/00_PROJECT_CONTEXT.md`
- `docs/01_PRD_PHASE_01.md`
- `docs/02_MASTER_TECHNICAL_ARCHITECTURE.md`
- `docs/03_TECHSPEC_PHASE_01.md`
- `docs/05_SECURITY_BASELINE_PHASE_01.md`
- `<ADR/tài liệu/module liên quan>`

## 6. User story / Use case

**Là** `<vai trò>`, **tôi muốn** `<hành động>`, **để** `<giá trị>`.

Luồng chính:

1. `<Bước 1>`
2. `<Bước 2>`
3. `<Bước 3>`

Luồng lỗi/ngoại lệ:

- `<Trường hợp lỗi và kết quả mong đợi>`
- `<Trường hợp cạnh tranh/retry/hết hạn nếu có>`

## 7. Quy tắc nghiệp vụ

1. `<Rule có thể kiểm thử>`
2. `<Rule có thể kiểm thử>`

Nếu thiếu giá, cọc, hủy/đổi, quyền, tài khoản ngân hàng, nội dung Zalo, kế toán, dữ liệu phòng/bàn: dừng và hỏi, không tự đoán.

## 8. Phạm vi kỹ thuật được phép thay đổi

- **Ứng dụng/module:** `<apps/...>`
- **File dự kiến:** `<danh sách>`
- **Database entities:** `<danh sách hoặc None>`
- **API:** `<danh sách hoặc None>`
- **Queue/events:** `<danh sách hoặc None>`
- **UI routes/components:** `<danh sách hoặc None>`

Không sửa ngoài danh sách nếu chưa báo rõ lý do, ảnh hưởng và được chấp thuận.

## 9. Data model và migration

- Bảng/field/index/constraint cần thêm: `<...>`
- Dữ liệu cũ/backfill: `<...>`
- Chiến lược rollback: `<...>`
- Không sửa migration đã chạy; không dùng `db push` ở production.

## 10. API contract

### `<METHOD /path>`

- **Auth/permission:** `<...>`
- **Headers:** `<Idempotency-Key nếu cần>`
- **Request:** `<schema/example>`
- **Response thành công:** `<schema/example>`
- **Lỗi:** `<status + error code>`
- **Side effects:** `<audit/event/job>`

OpenAPI phải cập nhật cùng code.

## 11. UI/UX

- Desktop/mobile behavior: `<...>`
- Loading state: `<...>`
- Empty state: `<...>`
- Error state: `<...>`
- Validation/accessibility: `<...>`
- Thiết kế hoặc ảnh tham chiếu: `<link/path>`

## 12. Yêu cầu bảo mật và riêng tư

- Threats chính: `<authz, IDOR, XSS, injection, replay, race...>`
- Server-side authorization: `<permission>`
- Validation/sanitization: `<...>`
- Rate limit/idempotency: `<...>`
- Audit/log masking: `<...>`
- PII/retention: `<...>`
- RLS/storage policy: `<...>`

## 13. Observability

- Log/event/metric cần thêm: `<...>`
- Correlation ID xuyên luồng: `<Có/Không>`
- Alert hoặc dashboard: `<...>`
- Không log token, OTP, secret hoặc PII đầy đủ.

## 14. Test cases bắt buộc

### Unit

- [ ] `<Business rule/happy path>`
- [ ] `<Boundary/negative case>`

### Integration

- [ ] `<Database constraint/transaction>`
- [ ] `<Queue/provider adapter>`

### E2E

- [ ] `<Critical user flow>`
- [ ] `<Unauthorized/forbidden flow>`

### Security/concurrency

- [ ] `<IDOR/input/replay/race case>`
- [ ] `<Sensitive data is not exposed/logged>`

## 15. Acceptance criteria

- [ ] Given `<context>`, when `<action>`, then `<observable result>`.
- [ ] Given `<error/edge context>`, when `<action>`, then `<safe result>`.
- [ ] Permission, audit, loading/empty/error và mobile được nghiệm thu khi liên quan.
- [ ] Không còn mock/TODO trong luồng production.

## 16. Lệnh kiểm tra bắt buộc

```text
<lint command>
<type-check command>
<unit/integration/e2e command>
<build command>
<migration validation command>
```

## 17. Definition of Done

- [ ] Code đúng phạm vi và quy tắc kiến trúc.
- [ ] Lint/type check/build đạt.
- [ ] Các test bắt buộc đạt; không xóa/skip test để qua CI.
- [ ] Migration, OpenAPI, permission và audit đã cập nhật.
- [ ] UI states/mobile/accessibility đã kiểm tra nếu có.
- [ ] Không có secret, mock production hoặc lỗi security mức nghiêm trọng.
- [ ] Có hướng dẫn kiểm thử thủ công và báo cáo rủi ro còn lại.

## 18. Định dạng báo cáo AI sau khi hoàn thành

1. Tóm tắt đã thực hiện.
2. File đã thay đổi.
3. Migration đã tạo.
4. API/event/job đã thêm hoặc thay đổi.
5. Test đã chạy và kết quả chính xác.
6. Hướng dẫn kiểm thử thủ công.
7. Ảnh hưởng bảo mật và cách kiểm soát.
8. Rủi ro, giả định, nội dung chưa hoàn thành hoặc câu hỏi còn mở.

AI không được tuyên bố “Done” nếu chưa chạy được các kiểm tra bắt buộc; phải ghi rõ kiểm tra nào chưa chạy và lý do.
