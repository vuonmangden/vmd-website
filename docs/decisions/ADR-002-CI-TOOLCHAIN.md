# ADR-002 — CI Toolchain

- **Trạng thái:** Accepted
- **Ngày:** 2026-08-08
- **Phạm vi:** Phase 1 / FND-003
- **Đóng quyết định:** DEC-002

## Bối cảnh

DEC-002 yêu cầu xác nhận lệnh chuẩn và toolchain CI trước khi triển khai FND-003. Các lệnh chuẩn đã được thiết lập trong FND-001 và sử dụng ổn định qua FND-002, FND-004, FND-005.

## Quyết định

1. **CI platform:** GitHub Actions.
2. **Trigger:** push và pull_request vào `main`.
3. **Lệnh chuẩn monorepo:**
   - `pnpm install --frozen-lockfile` — deterministic install.
   - `pnpm lint` — ESLint qua Turborepo + lint scripts/mocks riêng.
   - `pnpm typecheck` — TypeScript qua Turborepo.
   - `pnpm test` — Jest (API) + Vitest (web/admin/packages) qua Turborepo + node:test cho scripts.
   - `pnpm build` — Turborepo build tất cả apps/packages.
   - `pnpm ci:prisma` — validate Prisma schema và cấu trúc migration.
4. **Secret scan:** Gitleaks container immutable-pinned, quét source và Git history.
5. **Dependency scan:** `pnpm audit --prod --audit-level high`.
6. **Runtime:** Node 24.14.0 + pnpm 11.9.0 qua Corepack (khớp `package.json` engines).
7. **Concurrency:** cancel-in-progress cho cùng ref, tránh lãng phí runner.
8. **Supply chain:** GitHub Actions pin theo full commit SHA, quyền workflow `contents: read`, cache pnpm theo lockfile và timeout rõ ràng.

## MNT-001 amendment — 2026-08-09

Dependency overrides tương thích được giới hạn tại `pnpm-workspace.yaml`: `@playwright/test`/`playwright` 1.55.1 để loại advisory transitive từ Next, và `js-yaml` 5.2.2 để xử lý advisory qua Swagger. Next được cập nhật cùng major từ 16.2.12 lên 16.3.0 để nhận Sharp/PostCSS đã vá. Đây không phải thay đổi kiến trúc hay major version; production audit còn 3 Moderate và 0 High/Critical.

## Lý do

- Các lệnh đã được kiểm chứng local qua 4 foundation tasks (16 API tests + monorepo tests, lint/typecheck/build 12/12).
- gitleaks là công cụ secret scan được sử dụng rộng rãi, có GitHub Action chính thức.
- `pnpm audit` tận dụng advisory database của npm, không cần thêm dependency.
- Tách job CI (lint/typecheck/test/build) và Security (scan) để chạy song song.

## Hệ quả

- DEC-002 đóng.
- Mọi PR phải pass CI trước khi merge (cần bật branch protection thủ công).
- Integration test với database service sẽ bổ sung khi có task CI nâng cao.
- E2E test và preview deploy thuộc phạm vi REL-001.
