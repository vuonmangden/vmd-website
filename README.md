# Vườn Măng Đen platform

Foundation-only pnpm/Turborepo workspace for the Phase 1 modular monolith. It contains technical application shells and no room, booking, BBQ, payment, CMS, notification, database, queue, or provider implementation.

## Prerequisites

- Node.js 24.14.0 (Node.js 24 LTS; see `.node-version` and `.nvmrc`)
- Corepack with pnpm 11.9.0

Enable the pinned package manager with `corepack enable`, then use the commands below from the repository root.
Installation is rejected when Node.js is outside the 24.x line because `engine-strict` is enabled.

## Commands

```text
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run one shell with `pnpm --filter @vmd/web dev`, `pnpm --filter @vmd/admin dev`, `pnpm --filter @vmd/api dev`, or `pnpm --filter @vmd/worker dev`. Default local ports are 3000, 3001, and 3002 for web, admin, and API. The worker is a long-running Nest application context with no queue, timer, or provider connection.

## Workspace boundaries

- `apps/web`: public Next.js shell.
- `apps/admin`: non-production admin Next.js shell; authentication and authorization are not implemented.
- `apps/api`: NestJS shell without database or production health foundation.
- `apps/worker`: NestJS worker shell without queue jobs.
- `packages/*`: dependency-direction-safe shared scaffolds. Shared packages never import applications.
- `prisma`, `infrastructure/docker`, `.github/workflows`: routing placeholders for later foundation tasks only.

## Environment boundary

Copy `.env.example` to an ignored local environment file when needed. Browser code may only consume explicitly documented `NEXT_PUBLIC_*` values. Database URLs, service-role keys, credentials, tokens, and webhook secrets are server-only and intentionally absent from this foundation template. Builds do not require production secrets.
