# QLT-001 — Test suite hoàn chỉnh (Critical regression)

**Ngày:** 2026-09-03 · **Thực hiện:** Claude

## Phạm vi và phương pháp

Tracker chỉ ghi "Critical regression" cho task này, không có task spec riêng. Diễn giải: mục tiêu là đảm bảo các luồng nghiệp vụ/an ninh quan trọng có test khóa hành vi lại (regression), **không phải** đạt 100% coverage — đúng tinh thần MVP của dự án (không thêm test cho logic ít rủi ro chỉ để tăng số %).

Cách làm: chạy `jest --coverage` cho `@vmd/api` (coverage tooling có sẵn qua Jest/istanbul, không cần thêm dependency), lấy danh sách file có branch coverage thấp nhất, rồi **chọn lọc theo mức độ quan trọng nghiệp vụ/bảo mật** — bỏ qua các helper ít rủi ro (ví dụ `bounded()` clamp phân trang) dù coverage thấp, ưu tiên các file chạm vào access control, xác thực, hoặc luồng khách hàng công khai (IDOR-sensitive).

## Coverage trước/sau (API)

| Metric | Trước | Sau |
|---|---|---|
| Statements | 85.07% | 86.91% |
| Branches | 71.75% | 73.69% |
| Functions | 86.52% | 89.18% |
| Lines | 88.71% | 90.53% |
| Test suites | 69 | 71 |
| Tests | 458 | 481 (23 test mới) |

## File đã bổ sung test

- **`apps/api/src/modules/rooms/resource-holds.service.spec.ts`** — thêm 2 test cho nhánh `invalidHold()` chưa từng được chạm tới (end ≤ start; idempotency key rỗng). File này là trung tâm của bản sửa Critical ở `SEC-001` (`HoldExpirySweepService` gọi `expireDue()` của service này), nên khóa lại đường validate đầu vào là hợp lý.
- **`apps/api/src/modules/auth/auth.controller.spec.ts`** (mới, chưa từng có spec) — 8 test cho `login`/`refresh`/`logout`/`me`. Quan trọng nhất: xác nhận `recordFailure()` (rate-limit chống brute-force) chỉ được gọi khi lỗi thật là `UnauthorizedException` (sai mật khẩu), **không** bị gọi khi lỗi là do provider tạm thời gián đoạn (`ServiceUnavailableException`) — nếu logic này bị đảo ngược trong tương lai, tài khoản thật có thể bị khóa oan bởi lỗi hạ tầng, hoặc brute-force thật không bị chặn.
- **`apps/api/src/modules/auth/staff-management.controller.spec.ts`** (mới, chưa từng có spec) — 7 test. Quan trọng nhất: xác nhận đúng thứ tự composition của `invite()` (tạo `StaffProfile` trước, gán vai trò sau) và hành vi khi bước gán vai trò thất bại (lỗi được ném ra cho client thấy, không nuốt âm thầm — dù hồ sơ đã tạo vẫn còn, đây là hành vi hiện tại được ghi nhận qua test, không phải bug được sửa trong task này).
- **`apps/api/src/modules/rooms/booking-lookup.service.spec.ts`** — thêm 7 test cho `createGuestRequest()` (trước đó **0 test** dù đây là điểm vào công khai cho khách gửi yêu cầu hủy/đổi ngày): booking không `CONFIRMED`, ngày check-in đã qua, đã dùng hết lượt đổi ngày tự động, khoảng ngày yêu cầu không hợp lệ, đã có yêu cầu đang mở, và sai mã/SĐT (cùng hành vi ẩn danh như `lookup()`).

## Đã xem xét nhưng cố ý không thêm test

- `admin-customers.controller.ts`, `contact-rate-limit.service.ts` — coverage thấp nhưng chỉ do helper phân trang/rate-limit boundary đơn giản, rủi ro thấp nếu sai (không phải lỗ hổng bảo mật hay mất dữ liệu).
- `storage.config.ts` (0% branch) — toàn bộ nhánh production fail-closed, đã test gián tiếp qua `media.service.spec.ts`; production chưa mở khóa (chờ `PRE-007`) nên rủi ro thực tế bằng 0 ở giai đoạn này.
- `BookingLookupService.review()`/`printable()` — nghiệp vụ đơn giản (chuyển trạng thái/lọc status), rủi ro thấp hơn `createGuestRequest()`/`decide()` (đã test đầy đủ từ trước).

## Kết quả gate

`pnpm --filter @vmd/api run lint/typecheck/build` đều đạt; `jest --coverage` 481/481 test đạt (71 suite).

## Việc còn lại ngoài phạm vi

Task này chỉ bao phủ `@vmd/api` (nơi có coverage tooling sẵn qua Jest). `@vmd/web`/`@vmd/admin` dùng Vitest, chưa cài `@vitest/coverage-v8` — muốn đo coverage tương tự cần thêm dependency mới, ngoài phạm vi một lần quét nhanh. Không phát hiện dấu hiệu thiếu test nghiêm trọng ở hai workspace này qua rà soát thủ công (mỗi trang admin đều có `*.test.tsx` đi kèm theo đúng quy ước đã thiết lập từ `ADM-003`).
