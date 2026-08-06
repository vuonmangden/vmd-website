# FND-002 Local Environment — Test Evidence

## Test context

- **Executed at:** 2026-08-06 18:06:30 +07:00
- **Branch:** `chore/fnd-002-local-development`
- **Baseline commit tested with review working tree:** `eb74fe9`
- **Node.js:** `v24.14.0`
- **pnpm:** `11.9.0`
- **Docker CLI/Engine:** `29.6.2`
- **Docker Compose:** `v5.3.1`

No password, token, private key or production account is recorded in this evidence.

## Quality gates

| Check | Actual result |
|---|---|
| `pnpm install --frozen-lockfile` | Passed; lockfile unchanged, pnpm 11.9.0 |
| `pnpm lint` | Passed; 12/12 workspace tasks plus FND-002 scripts/mocks; Turbo cache bypass |
| `pnpm typecheck` | Passed; 12/12 tasks; Turbo cache bypass |
| `pnpm test` | Passed; 12/12 workspace tasks plus 7/7 FND-002 Node unit tests |
| `pnpm build` | Passed; 12/12 tasks including all four application shells; Turbo cache bypass |
| Compose config validation | Passed using `.env.example` fallback |

Quality gates were run with `TURBO_FORCE=true`. After Windows terminated parallel ESLint processes with system code `0xC0000409`, the complete gates were rerun successfully with `TURBO_CONCURRENCY=1`; no check was skipped or forced to pass.

## FND-002 unit coverage

- Mock SePay and Mock Zalo: health, success, error and 404 not-found responses passed.
- `infra-check`: injected failing check returned exit code `1` and named the failed check.
- Env selection: `.env` preferred when present; `.env.example` fallback passed.
- PostgreSQL configuration: matching port passed; mismatched `POSTGRES_PORT`/`DATABASE_URL` rejected.
- Unit tests did not require Docker.

## Docker integration checks

The following commands/steps were run against the local Docker Engine:

1. Validate Compose configuration.
2. `pnpm infra:up` from a stopped state.
3. `pnpm infra:status`.
4. `pnpm infra:check`.
5. Capture MinIO marker metadata.
6. `pnpm infra:down` without `-v` and confirm four volumes remain.
7. Start again, rerun `infra:check`, and capture marker metadata again.
8. Stop services and confirm no FND-002 container remains while volumes remain.

| Service | Actual result |
|---|---|
| PostgreSQL 16 | Healthy; `SELECT 1` returned `1` |
| Redis | Healthy; `PING` returned `PONG` |
| Mailpit | Healthy; SMTP banner `220`; Web UI HTTP 200 |
| MinIO | Healthy; API HTTP 200; Console HTTP 200; bucket and marker read-only check passed |
| Mock SePay | Healthy; deterministic success HTTP 200 and error HTTP 422 passed |
| Mock Zalo | Healthy; deterministic success HTTP 200 and error HTTP 422 passed |

## Persistence evidence

- Volumes before and after normal down: `vmd-local_postgres_data`, `vmd-local_redis_data`, `vmd-local_mailpit_data`, `vmd-local_minio_data`.
- Marker path: `vmd-local/.vmd-infrastructure-marker`.
- Marker content: `vmd-local-infrastructure-marker-v1`.
- Before restart: last modified `2026-08-06T10:55:58Z`, ETag `66bc0ef007f1152412a3541f84bc7bf6-1`, size 35 bytes.
- After restart: the same last-modified timestamp, ETag and size.
- This demonstrates that `infra:up` did not recreate the existing marker and `infra:check` only read it.
- Final state: no Compose containers running; all four named volumes retained.

## Not run / blocked

None. All checks required by the FND-002 review were run successfully on the current machine.
