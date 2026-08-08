# GitHub Actions Workflows

## ci.yml

PR and main branch CI pipeline:

- **ci job:** Install → Lint → Typecheck → Test → Prisma Validate → Build
- **security job:** Secret scan (gitleaks) + Dependency audit (pnpm audit)

Triggers on push and pull_request to `main`.
