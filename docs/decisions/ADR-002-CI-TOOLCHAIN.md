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
   - `npx prisma validate --schema prisma/schema.prisma` — validate Prisma schema.
4. **Secret scan:** gitleaks via `gitleaks/gitleaks-action@v2`.
5. **Dependency scan:** `pnpm audit --prod --audit-level high`.
6. **Runtime:** Node 24 + pnpm 11.9.0 qua Corepack (khớp `package.json` engines).
7. **Concurrency:** cancel-in-progress cho cùng ref, tránh lãng phí runner.

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
