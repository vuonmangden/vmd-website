# Build context MUST be the monorepo root (pnpm workspace + root prisma/
# schema), not this directory:
#   docker build -f apps/api/Dockerfile .
# On DigitalOcean App Platform: Source Directory = "/", Dockerfile Path =
# "apps/api/Dockerfile".
#
# Trades a larger image for a build that cannot silently omit a workspace
# file — no turbo-prune file selection, no manual node_modules copy list.
# `pnpm prune --prod` removes devDependencies after the build instead.
FROM node:24.14.0-alpine3.23 AS base
# Prisma's query engine needs OpenSSL even with the pg driver adapter; Alpine
# ships without it by default.
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@vmd/api...
# Root-level `pnpm prune` removes workspace package dependencies. Deploy an
# isolated production tree instead, retaining the generated Prisma client.
RUN CI=true pnpm --filter @vmd/api deploy --legacy --prod --ignore-scripts /opt/api
# `deploy --ignore-scripts` intentionally does not run Prisma generation in
# the isolated tree. Copy the already-generated client beside its deployed
# @prisma/client package, without retaining the Prisma CLI in runtime.
RUN source_dir="$(dirname "$(dirname "$(find /app/node_modules/.pnpm -path '*/node_modules/@prisma/client' -type d -print -quit)")")" \
 && target_dir="$(dirname "$(dirname "$(find /opt/api/node_modules/.pnpm -path '*/node_modules/@prisma/client' -type d -print -quit)")")" \
 && cp -a "$source_dir/.prisma" "$target_dir/.prisma"

FROM base AS runtime
ENV NODE_ENV=production
ENV API_PORT=3002
COPY --from=build /opt/api /app
WORKDIR /app
EXPOSE 3002
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3002)+'/api/v1/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
