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
RUN pnpm prune --prod

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/worker
USER node
CMD ["node", "dist/main.js"]
