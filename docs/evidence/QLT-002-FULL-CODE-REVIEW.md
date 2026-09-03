# QLT-002 — Full code review (toàn bộ codebase)

**Ngày:** 2026-09-03 · **Thực hiện:** Claude · **Phạm vi:** 470 file nguồn (`apps/`, `packages/`, `prisma/`, `scripts/`)

## Vì sao có task này

Chủ dự án yêu cầu review lại toàn bộ code trước khi làm nốt các task còn lại. Khác với `SEC-001` (ASVS Level 2, chỉ security) và `SEC-002` (DAST, chỉ chạy thật), lần này quét cả correctness/resilience/kiến trúc trên toàn repo.

## Kết luận ngắn

Phần lớn codebase **chắc chắn hơn mong đợi** — các lớp lỗi nghiêm trọng thường gặp ở dự án booking/payment đều đã được xử lý đúng từ đầu. Tìm được **2 lỗi thật**, cả hai đều đã sửa trong PR này.

## Những phần đã kiểm tra và KHÔNG có vấn đề

| Hạng mục | Cách kiểm tra | Kết quả |
|---|---|---|
| Phân quyền admin | Script parse từng class controller, map `@Controller` → `@UseGuards` | **0/33 route `admin/*` bị hở**; tất cả đều có `AdminAuthGuard` |
| 3 controller chỉ có `AdminAuthGuard` (`admin/contact-submissions`, `admin/settings`, `admin/site-settings`) | Đọc service tương ứng | Không phải lỗ hổng — service tự check role (`CONTACT_READ_ROLES`, `SETTINGS_WRITE_ROLES`, `SYSTEM_SETTINGS_ROLES`), thậm chí granular hơn (per-key Super Admin) |
| Tiền | Grep float arithmetic + đọc schema | `BigInt` toàn bộ (24 cột tiền), **không có phép tính float nào** |
| Double-booking phòng | Đọc schema + grep `P2002` | `@@unique([roomId, stayDate])` chặn ở tầng DB — race condition không thể tạo trùng; `P2002` được xử lý ở **mọi** write path (11 chỗ), trả 409 chứ không phải 500 |
| Quota BBQ | Đọc `public-bbq-reservations.service.ts` | `pg_advisory_xact_lock` — serialize đúng chuẩn |
| Webhook SePay (tiền vào) | Đọc service + config | `timingSafeEqual` + guard độ dài trước khi so sánh + fail-closed ở production |
| Rò rỉ lỗi ra client | Đọc `all-exceptions.filter.ts` | Chỉ trả message generic, stack chỉ log server-side |
| XSS frontend | Grep `dangerouslySetInnerHTML` | Không có chỗ nào (148 file web+admin) |
| Lưu token ở browser | Grep `localStorage`/`sessionStorage`/`document.cookie` | Không có |
| Secret | `git ls-files` + đọc `.gitignore` | `.env` không bị track; `.gitignore` phủ `.env*`, `backups/`, `*.dump` |
| Nợ kỹ thuật | Grep `TODO`/`FIXME`/`HACK` | **Không còn cái nào** |
| DTO value-import (lỗi `SEC-002`) | Script check mọi controller dùng `@Body()` | Sạch — fix cũ vẫn giữ |
| Lớp lỗi DI (`SEC-002`) | Grep toàn repo | Đúng 7 file thuộc PR #95 của Codex, **không phát sinh thêm**. 3 file `apps/worker/*.provider.ts` có default param nhưng là plain class dựng bằng factory (`new ResendEmailProvider(...)`), không qua DI → không sao |

## Lỗi 1 — `HIGH`: một blip DB giết cả tiến trình API lẫn worker

**Cả 4** service chạy nền đều dùng `void this.method()` không kèm `.catch()`, và trong cả 4, `await` đầu tiên là một query Prisma **nằm ngoài mọi try/catch**:

| File | Query không được bảo vệ |
|---|---|
| `apps/api/src/modules/rooms/hold-expiry-sweep.service.ts` (code viết ở `SEC-001`) | `payments.expireDue()` |
| `apps/worker/src/outbox/outbox.processor.ts` | `outboxEvent.findMany` (try/catch chỉ bọc trong vòng lặp, không bọc query mở đầu) |
| `apps/worker/src/notification/notification-dispatch.service.ts` | `notificationJob.findMany` (`dispatchOne` tự catch, nhưng query nuôi nó thì không) |
| `apps/worker/src/notification/reminder-scan.service.ts` | `booking.findMany` và cả `enqueueBookingReminder` |

Không có `process.on('unhandledRejection')` ở bất kỳ đâu trong repo → áp dụng mặc định của Node ≥15: **terminate process**. Supabase là managed DB có failover/maintenance định kỳ, nên đây không phải tình huống lý thuyết. Nghịch lý: vòng lặp polling sinh ra để *chịu* lỗi tạm thời, nhưng ở đây một blip DB lại giết luôn cả HTTP server — vì sweep chạy chung tiến trình với API.

**Bằng chứng tái hiện (mạnh hơn assertion thường)**: chạy test mới trên code cũ thì Jest **không kịp báo test fail** — cả tiến trình Node chết:

```
[Error: database is unavailable]
Node.js v24.14.0
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @vmd/api@0.0.0 test
```

Sau khi sửa, cùng test đó: `Tests: 4 passed`.

**Sửa**: `.catch()` ở cả 4 chỗ, log lỗi và để tick sau chạy lại. Thêm 4 regression test dùng `process.on('unhandledRejection')` để bắt đúng lỗi này, kèm assert vòng lặp **vẫn sống** ở interval kế tiếp.

## Lỗi 2 — `MEDIUM-HIGH`: Swagger phơi toàn bộ API ra Internet ở production

`main.ts` mount Swagger **không có điều kiện môi trường nào**, trong khi mọi switch nhạy cảm khác trong repo đều gate bằng `APP_ENV` (`security.config`, `auth.config`, `supabase-admin.service`, `storage.config`, `sepay-webhook.config`). Swagger mount thẳng lên Express instance nên **không guard nào của Nest áp dụng được**.

**Live-verify với `APP_ENV=production`, curl không kèm token:**

```
GET /api/docs        -> 200
GET /api/docs-json   -> 200
→ 119 path, trong đó 92 endpoint admin
  /admin/staff/invite, /admin/access/users, /admin/customers ...
```

Bản thân các endpoint vẫn guard đúng (đã verify: `/admin/customers` không token → 401), nên đây là **information disclosure chứ không phải authz bypass**. Nhưng nó trao cho attacker toàn bộ bản đồ hệ thống: mọi endpoint, tham số, DTO shape, luật validation — đúng thứ cần cho bước recon.

**Sửa**: gate bằng `securityConfig.environment !== 'production'`, **tái dùng environment đã resolve và validate sẵn** từ `SecurityConfigService` (`main.ts` vốn đã gọi nó) thay vì tự đọc lại `APP_ENV` — tránh tạo nguồn sự thật thứ hai.

**Live-verify sau khi sửa (cả hai chiều):**

| | `APP_ENV=production` | `APP_ENV=development` |
|---|---|---|
| `GET /api/docs` | **404** | 200 |
| `GET /api/docs-json` | **404** | 200 |

Và không chặn nhầm gì: `/api/v1/public/articles` → 200, `/api/v1/metrics` → 200, `/api/v1/admin/customers` không token → 401.

## Xác minh

- `pnpm test`: **498/498 (API) + 75/75 (worker)** đạt — thêm 4 test mới.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`: đạt 12/12 package.
- Live-test HTTP thật cho lỗi 2 (cả production lẫn development), mượn tạm 7 file DI-fix từ nhánh Codex `codex/rel-001-local-build-smoke` để boot được, **đã revert sạch** sau khi test.

## Ghi chú cho các task sau

- Lỗi 1 là biến thể thứ ba của cùng một chủ đề đã gặp ở `SEC-002` (test mock enshrine hành vi sai) và `OPS-005` (interceptor đọc status code sai thời điểm): **unit test mock không bao giờ thấy được lỗi thuộc về vòng đời/runtime thật**. Khi review tiếp, ưu tiên chạy thật hơn đọc diff.
- Hai lỗi này đều nằm ngoài phạm vi `REL-001` của Codex, không xung đột với PR #93/#94/#95.
