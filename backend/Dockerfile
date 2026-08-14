# Stage 1: Dependencies
FROM node:24-alpine AS deps

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache libc6-compat build-base python3 openssl

RUN npm install -g node-gyp-build cross-env node-gyp

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY backend/prisma ./backend/prisma/
COPY scripts/postinstall.js ./scripts/postinstall.js

ENV CI=true

RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --no-audit --no-fund --workspaces

RUN npm run db:generate --workspace=backend

# Stage 2: Builder
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app ./
COPY scripts ./scripts
COPY backend ./backend
COPY frontend ./frontend

RUN npm run build --workspace=backend

# Stage 3: Production
FROM node:24-alpine AS production

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache tini openssl libc6-compat

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/

ENV NODE_ENV=production NODE_OPTIONS="--max-old-space-size=512"
ENV PATH="/app/backend/node_modules/.bin:/app/node_modules/.bin:${PATH}"
ENV NODE_PATH="/app/node_modules:/app/backend/node_modules"

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
RUN if [ -d ./backend/node_modules ]; then cp -rn ./backend/node_modules/* ./node_modules/ 2>/dev/null || true; fi
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=deps /app/backend/prisma ./backend/prisma
COPY --from=builder /app/scripts/backup-db.sh ./scripts/backup-db.sh

RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "export NODE_OPTIONS=$(echo \"${NODE_OPTIONS:-}\" | sed 's/--optimize-for-size//g'); export DIRECT_URL=\"${DIRECT_URL:-$DATABASE_URL}\"; if [ -n \"$DATABASE_URL\" ] && [ \"$AUTO_MIGRATE\" != \"false\" ]; then echo '🚀 Applying Prisma database migrations...'; npx prisma migrate deploy --schema=./backend/prisma/schema.prisma || npx prisma db push --schema=./backend/prisma/schema.prisma --accept-data-loss || echo '⚠️ Database migration notice: proceed to startup'; fi; if [ -f backend/dist/backend/src/main.js ]; then node backend/dist/backend/src/main; elif [ -f backend/dist/src/main.js ]; then node backend/dist/src/main; else node backend/dist/main; fi"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD sh -c "export NODE_OPTIONS=\$(echo \"\${NODE_OPTIONS:-}\" | sed 's/--optimize-for-size//g'); node -e \"require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))\""
