# Build context MUST be the monorepo root:
#   docker build -f apps/worker/Dockerfile .
# On DigitalOcean App Platform: Source Directory = "/", Dockerfile Path =
# "apps/worker/Dockerfile", component type = Worker (no HTTP port).
#
# No HEALTHCHECK here on purpose: the worker has no HTTP server (see
# apps/worker/src/main.ts — createApplicationContext, not a listening app),
# so an HTTP check would have to fake one. App Platform's Worker component
# type tracks liveness by process exit code instead.
FROM node:24.14.0-alpine3.23 AS base
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@vmd/worker...
# Root-level `pnpm prune` removes workspace package dependencies. Deploy an
# isolated production tree instead, retaining the generated Prisma client.
RUN CI=true pnpm --filter @vmd/worker deploy --legacy --prod --ignore-scripts /opt/worker
# `deploy --ignore-scripts` intentionally does not run Prisma generation in
# the isolated tree. Copy the already-generated client beside its deployed
# @prisma/client package, without retaining the Prisma CLI in runtime.
RUN source_dir="$(dirname "$(dirname "$(find /app/node_modules/.pnpm -path '*/node_modules/@prisma/client' -type d -print -quit)")")" \
 && target_dir="$(dirname "$(dirname "$(find /opt/worker/node_modules/.pnpm -path '*/node_modules/@prisma/client' -type d -print -quit)")")" \
 && cp -a "$source_dir/.prisma" "$target_dir/.prisma"

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /opt/worker /app
WORKDIR /app
USER node
CMD ["node", "dist/main.js"]
