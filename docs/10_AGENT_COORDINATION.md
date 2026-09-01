# Agent Coordination — Claude Code và Codex

Dự án này được thực hiện song song bởi hai AI coding agent. Tài liệu này quy định
cách hai bên phối hợp để không làm trùng việc.

## 1. Sự cố đã xảy ra — lý do có tài liệu này

Ngày 2026-08-16, Claude triển khai lại toàn bộ IAM-001 đến IAM-005 và NTF-002 —
sáu task mà Codex đã merge vào `main` từ ngày 2026-08-11. Sáu Pull Request
(#41–#46) bị đóng vì trùng lặp.

Nguyên nhân: Claude làm việc từ nhánh `chore/mnt-001-repository-audit-cleanup`
và đọc bản `08_PROGRESS_TRACKER.md` **trên nhánh đó**, nơi mọi task còn ghi
`Backlog`. Thực tế `main` đã đi trước 39 commit.

Bài học: **bản tracker trên nhánh feature phản ánh thời điểm nhánh được tạo, không
phải hiện tại.**

## 2. Quy tắc bắt buộc trước khi bắt đầu bất kỳ task nào

Chạy đúng ba lệnh này trước khi viết dòng code đầu tiên:

```bash
git fetch origin main
git show origin/main:docs/08_PROGRESS_TRACKER.md
git log --oneline origin/main -25
```

- Tracker phải đọc từ `origin/main`, không đọc bản trên nhánh đang làm.
- `git log` là nguồn chuẩn cuối cùng. Nếu tracker và commit log mâu thuẫn,
  **tin commit log** và sửa tracker.
- Nếu task đã có commit trên `main`, dừng lại và báo chủ dự án.

Kiểm tra thêm khi task chạm vào module cụ thể:

```bash
git ls-tree -r --name-only origin/main | grep <đường-dẫn-module>
```

## 3. Claim task trước khi làm

Trước khi code, cập nhật dòng task trong tracker sang `In progress` kèm tên agent
và ngày, rồi commit riêng và push ngay:

```text
| CMS-001 | Site settings | In progress (Claude, 2026-08-16) | ... |
```

Commit claim đi một mình, không kèm code:

```bash
git commit -m "docs(tracker): claim CMS-001 for Claude"
git push
```

Việc này biến tracker thành một lock nhẹ. Agent còn lại fetch `main` sẽ thấy
task đã có người nhận.

## 4. Quy ước đặt tên nhánh

| Agent | Tiền tố | Ví dụ |
|---|---|---|
| Codex | `codex/` | `codex/iam-002-rbac` |
| Claude | `claude/` | `claude/cms-001-site-settings` |

Tiền tố cho biết ai đang làm chỉ bằng `git branch -r`. Nhánh không có tiền tố
agent (`chore/`, `feat/`) là nhánh cũ trước quy ước này.

Một task một nhánh. Không gộp nhiều Task ID vào một nhánh — nếu phải revert thì
không tách được.

## 5. Sau khi hoàn thành

Cập nhật dòng tracker với: trạng thái, số PR, commit merge, kết quả test, ghi chú
bảo mật và giới hạn còn lại. Thêm một dòng vào mục 19 "Lịch sử cập nhật" ghi rõ
agent nào làm.

Tracker phải được cập nhật **trong cùng PR** với code. Nếu để sang PR khác, nó sẽ
nằm lại trên nhánh chưa merge — đúng lỗi đã gây ra sự cố mục 1.

## 6. Phân chia phạm vi để giảm va chạm

Khi cả hai agent cùng hoạt động, chia theo ranh giới module thay vì theo task đơn
lẻ. Ví dụ: một bên giữ `apps/api/src/modules/booking/**`, bên kia giữ
`apps/web/**`. Các file dùng chung dễ xung đột nhất:

- `prisma/schema.prisma` và thư mục migration — chỉ một agent được đụng tại một thời điểm
- `apps/api/src/app.module.ts` và `apps/worker/src/worker.module.ts`
- `package.json`, `pnpm-lock.yaml`
- `.env.example`

Nếu task cần migration, ghi rõ trong tracker để bên kia tránh tạo migration cùng lúc.

## 7. Khi phát hiện trùng lặp

1. Dừng ngay, không code tiếp.
2. So sánh: `git diff origin/main -- <đường-dẫn>`.
3. Nếu bản trên `main` đủ dùng, đóng PR kèm lý do và dẫn PR gốc.
4. Nếu bản của mình có phần giá trị mà `main` thiếu, tách riêng phần đó thành PR
   nhỏ trên nền `main`, bỏ phần trùng.

## 8. Tài liệu là nguồn chuẩn

| Tài liệu | Vai trò |
|---|---|
| `docs/08_PROGRESS_TRACKER.md` | Trạng thái mọi task — điểm bàn giao chính giữa hai agent |
| `docs/09_MILESTONE_0_INPUT_PACK.md` | Dữ liệu vận hành chủ dự án cần cung cấp |
| `docs/tasks/<TASK-ID>.md` | Đặc tả và bằng chứng triển khai từng task |
| `docs/decisions/` | ADR cho quyết định kiến trúc |
| `AGENTS.md` | Quy tắc bắt buộc, cả hai agent đều phải theo |

`AGENTS.md` được cả Claude Code và Codex đọc tự động, nên nó là nơi đặt quy tắc
chung. Tài liệu này được `AGENTS.md` §17 tham chiếu tới.

## 9. Gợi ý công cụ hỗ trợ

Các cách dưới đây bổ sung cho quy trình trên, không thay thế:

- **GitHub Issues + Projects**: mỗi Task ID một issue, gán agent qua label
  `agent:claude` / `agent:codex`. Trạng thái nhìn thấy được mà không cần clone repo.
  Phù hợp nhất nếu chủ dự án muốn theo dõi trên điện thoại.
- **Branch protection** (đã bật trên `main`): buộc mọi thay đổi đi qua PR, nên
  không agent nào ghi đè trực tiếp lên `main`.
- **Draft PR mở sớm**: tạo draft PR ngay khi bắt đầu task, trước khi có code.
  Nó hiện trong `gh pr list` và báo cho agent kia biết task đã có người làm.
  Đây là cách nhẹ nhất và không cần công cụ ngoài.

Cách rẻ nhất và đủ dùng: **claim trong tracker (mục 3) + draft PR mở sớm**.
