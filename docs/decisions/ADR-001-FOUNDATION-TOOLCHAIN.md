# ADR-001 — Foundation Toolchain

- **Trạng thái:** Accepted
- **Ngày:** 2026-08-05
- **Phạm vi:** Phase 1 / FND-001

## Bối cảnh

Tech Spec Phase 1 đã chốt các dòng công nghệ chính nhưng chưa khóa đầy đủ phiên bản pnpm, TypeScript, Turborepo, ESLint, test runner, package scope và ranh giới secret scanning giữa FND-001 và FND-003. Các nội dung này cần được chốt để AI coding không tự suy đoán khi khởi tạo repository.

## Quyết định

1. Phiên bản nền lấy từ `docs/03_TECHSPEC_PHASE_01.md`, mục 3.2–3.3; Master Architecture chỉ quyết định hướng kiến trúc tổng thể.
2. Dùng Node.js dòng 24 LTS; pnpm qua Corepack; Turborepo; Next.js 16.2.x cho Public/Admin Web; NestJS 11.x cho API; Prisma ORM 7.x và PostgreSQL 16.x cho các task database sau; Tailwind CSS với design tokens.
3. pnpm, TypeScript, Turborepo, ESLint và công cụ chưa khóa major trong Tech Spec được chọn ở phiên bản stable tương thích tại thời điểm scaffold, sau đó khóa chính xác trong `package.json`, Corepack và lockfile. Không tự nâng major trong task chức năng.
4. Dùng Vitest cho Public Web, Admin Web và shared packages; Jest cho NestJS API và Worker; Supertest cho API integration; Playwright cho E2E.
5. Dùng package scope `@vmd/*`.
6. Scaffold đủ `ui`, `config`, `types`, `validation`, `api-client`, `logging`, `auth`, `testing`. Không triển khai business logic giả trong FND-001.
7. FND-001 thiết lập `.gitignore`, `.env.example`, client/server environment boundary và kiểm tra cục bộ các file do task tạo. Secret scanning tự động trong CI thuộc FND-003.
8. `prisma/`, `infrastructure/docker/` và `.github/workflows/` có thể được tạo ở mức cấu trúc, nhưng nội dung lần lượt thuộc FND-005, FND-002 và FND-003.

## Lý do

- Giữ đúng Tech Spec và hạn chế AI tự lựa chọn công nghệ.
- Dùng công cụ quen thuộc với từng framework, giảm cấu hình tùy biến.
- Tạo trước ranh giới package để tránh di chuyển code về sau.
- Giữ FND-001 nhỏ, trong khi secret scanning tự động được triển khai đúng task CI.

## Hệ quả

- FND-001 đủ điều kiện chuyển sang `Ready`.
- Phiên bản chính xác đã cài phải xuất hiện trong báo cáo cuối task.
- Mọi thay đổi major hoặc thay đổi quyết định này cần Pull Request/ADR riêng và regression test phù hợp.
