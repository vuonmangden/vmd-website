# Build context MUST be the monorepo root:
#   docker build -f apps/admin/Dockerfile .
# On DigitalOcean App Platform: Source Directory = "/", Dockerfile Path =
# "apps/admin/Dockerfile".
#
# Same standalone-output pattern as apps/web/Dockerfile — see that file's
# comment for why the paths below are exact, not guessed.
FROM node:24.14.0-alpine3.23 AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@vmd/admin...

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build --chown=node:node /app/apps/admin/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/admin/public ./apps/admin/public
COPY --from=build --chown=node:node /app/apps/admin/.next/static ./apps/admin/.next/static
WORKDIR /app/apps/admin
EXPOSE 3001
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
