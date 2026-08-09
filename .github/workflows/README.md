# GitHub Actions Workflows

## ci.yml

PR and main branch CI pipeline:

- **quality job:** frozen install → lint → typecheck → test → Prisma/migration check → build
- **security job:** source/history secret scan (Gitleaks) + production dependency audit

Triggers on push and pull request to `main`, plus manual dispatch. Actions and scanner images are immutable-pinned; workflow permissions are read-only. Required checks and branch protection must be enabled and verified in GitHub before FND-003 can be marked `Done`.
