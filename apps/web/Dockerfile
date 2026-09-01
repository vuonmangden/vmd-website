# Build context MUST be the monorepo root:
#   docker build -f apps/web/Dockerfile .
# On DigitalOcean App Platform: Source Directory = "/", Dockerfile Path =
# "apps/web/Dockerfile".
#
# Uses Next.js `output: 'standalone'` (apps/web/next.config.ts) — the build
# already traces the minimal node_modules subset, so the runtime stage
# copies only .next/standalone, not the full workspace. Verified locally:
# with outputFileTracingRoot at the monorepo root, the entry point lands at
# apps/web/.next/standalone/apps/web/server.js, not at the standalone root —
# the paths below are copied from a real local build, not guessed.
FROM node:24.14.0-alpine3.23 AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@vmd/web...

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
WORKDIR /app/apps/web
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
