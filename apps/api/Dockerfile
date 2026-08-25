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
RUN pnpm prune --prod

FROM base AS runtime
ENV NODE_ENV=production
ENV API_PORT=3002
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3002
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3002)+'/api/v1/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
