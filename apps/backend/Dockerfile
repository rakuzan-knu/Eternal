# Stage 1: Base image with shared build tools and cache
FROM node:24-alpine AS base

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache libc6-compat build-base python3 openssl

RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

WORKDIR /app

# Stage 2: Install dependencies (isolated from frontend)
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages ./packages/
COPY apps/backend/prisma ./apps/backend/prisma/
COPY apps/backend/prisma.config.ts ./apps/backend/
COPY scripts ./scripts/

ENV CI=true

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter backend...

RUN pnpm --filter backend exec prisma generate

# Stage 3: Build TypeScript sources and workspace packages
FROM deps AS builder

COPY tsconfig.base.json* nx.json* ./
COPY apps/backend ./apps/backend
COPY packages ./packages

RUN pnpm --parallel \
         --filter @social-network/msg-codec \
         --filter @social-network/text-pipeline \
         --filter @social-network/blinded-crypto \
         --filter @social-network/feed-score \
         --filter @social-network/native \
         build \
    && pnpm --filter backend build

# Stage 4: Deploy clean production bundle via pnpm deploy
FROM builder AS deployer

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm --filter backend deploy --legacy --prod /app/deploy

# Stage 5: Minimal Production Runtime
FROM node:24-alpine AS production

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache tini openssl libc6-compat bash

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S -G appgroup appuser
WORKDIR /app

ENV NODE_ENV=production NODE_OPTIONS="--max-old-space-size=2048 --expose-gc" PORT=7860
ENV PATH="/app/node_modules/.bin:${PATH}"

# Copy isolated production bundle prepared by pnpm deploy
COPY --from=deployer /app/deploy ./
# Ensure compiled dist is always present in runtime
COPY --from=builder /app/apps/backend/dist ./dist

# Symlink /app/apps/backend/prisma -> /app/prisma and /app/apps/backend/dist -> /app/dist
# for full backward compatibility with docker-compose commands and external tooling
RUN mkdir -p /app/apps/backend /app/backend \
    && ln -s /app/prisma /app/apps/backend/prisma \
    && ln -s /app/dist /app/apps/backend/dist \
    && ln -s /app/prisma /app/backend/prisma \
    && ln -s /app/dist /app/backend/dist

COPY --from=builder /app/scripts/db/backup-db.sh ./scripts/db/backup-db.sh

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 7860 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "export NODE_OPTIONS=$(echo \"${NODE_OPTIONS:-}\" | sed 's/--optimize-for-size//g'); export DIRECT_URL=\"${DIRECT_URL:-$DATABASE_URL}\"; export DATABASE_URL=\"${DATABASE_URL}\"; if [ -n \"$DATABASE_URL\" ] && [ \"$AUTO_MIGRATE\" != \"false\" ]; then echo '🚀 Applying Prisma database migrations...'; prisma migrate deploy --schema=./prisma/schema.prisma; fi; if [ -f dist/main.js ]; then node dist/main; elif [ -f dist/src/main.js ]; then node dist/src/main; else node dist/backend/src/main; fi"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 7860) + '/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"