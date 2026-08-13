# TST-002 — Approved Staging Demo Seed

## Decision

On 2026-08-13, the project owner approved a temporary Demo 1 exception to seed deterministic `SYNTHETIC` fixtures into the confirmed staging Supabase project (`atefkvykvwgtuaiscxnm`). This exception is for Demo 1 only; it does not authorize production use, real inventory, real prices, banking configuration, or credentials in Git.

## Guard

The seed command must provide every one of the following values:

- `APP_ENV=staging`
- `ALLOW_SYNTHETIC_DATA=true`
- `SYNTHETIC_STAGING_DEMO_APPROVED=true`
- `SYNTHETIC_TARGET_PROJECT_REF=atefkvykvwgtuaiscxnm`

Production/prod/live values and `VERCEL_ENV=production` remain rejected. Any other remote database remains rejected.

## Scope

- Upsert-only synthetic fixture seed and its existing exact-marker cleanup path.
- No schema migration, provider configuration, or production deployment change.
- Future demo projects should use the normal `demo` environment guard instead of this staging exception.
