# Vườn Măng Đen platform

Foundation-only pnpm/Turborepo workspace for the Phase 1 modular monolith. It contains technical application shells and no room, booking, BBQ, payment, CMS, notification, database, queue, or provider implementation.

## Prerequisites

- Node.js 24 LTS, tối thiểu 24.14.0 (CI và các file version pin 24.14.0 để tái lập)
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

## Local development infrastructure

Install and start Docker Desktop before continuing. In PowerShell, verify it is ready:

```text
docker info
docker compose version
```

If `docker info` reports that the daemon is unavailable, open Docker Desktop and wait for **Engine running**. Copy the safe local template before the first start (`copy .env.example .env` on Windows Command Prompt, `cp .env.example .env` on macOS/Linux, or use your file manager). The scripts use `.env` when it exists and fall back to `.env.example` otherwise. From the repository root, start every local service with one command:

```text
pnpm infra:up
```

The first run downloads pinned images and can take several minutes. Useful commands:

```text
pnpm infra:status  # show container and health status
pnpm infra:check   # test every service and mock endpoint
pnpm infra:logs    # follow logs; press Ctrl+C to stop following
pnpm infra:down    # stop safely without deleting local volumes
```

All exposed ports bind to `127.0.0.1` and are accessible only from this computer by default.

| Local service | Address | Purpose |
|---|---|---|
| PostgreSQL 16 | `127.0.0.1:5432` | Local relational database; no business schema or seed |
| Redis | `127.0.0.1:6379` | Local cache/queue dependency |
| Mailpit SMTP | `127.0.0.1:1025` | Captures development email |
| Mailpit Web UI | `http://127.0.0.1:8025` | Shows captured email |
| MinIO S3 API | `http://127.0.0.1:9000` | Local S3-compatible API |
| MinIO Console | `http://127.0.0.1:9001` | Storage UI; use the fake local credentials in `.env.example` |
| Mock SePay | `http://127.0.0.1:4010` | Non-production deterministic provider mock |
| Mock Zalo | `http://127.0.0.1:4011` | Non-production deterministic provider mock |

Test a mock in PowerShell:

```text
Invoke-RestMethod http://127.0.0.1:4010/health
Invoke-RestMethod -Method Post http://127.0.0.1:4010/success
Invoke-WebRequest -Method Post http://127.0.0.1:4010/error -SkipHttpErrorCheck
Invoke-RestMethod http://127.0.0.1:4011/health
Invoke-RestMethod -Method Post http://127.0.0.1:4011/success
Invoke-WebRequest -Method Post http://127.0.0.1:4011/error -SkipHttpErrorCheck
```

PostgreSQL, Redis, Mailpit and MinIO use named Docker volumes. `pnpm infra:down` preserves them, so data remains after a normal stop and restart. There is intentionally no routine reset/delete command.

If startup reports that a port is already allocated, edit the copied `.env` without changing source files. Choose an unused host port and keep related values consistent. For example, changing `POSTGRES_PORT` to `55432` also requires changing the port inside `DATABASE_URL` to `55432`; the infrastructure script rejects mismatches with a clear error. All five infrastructure commands select the same env file on Windows, macOS and Linux.

> The documented users/passwords and mock responses are fake, local-only values. Never use this Compose file, its credentials, Mailpit, MinIO, or either mock provider in production.

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
