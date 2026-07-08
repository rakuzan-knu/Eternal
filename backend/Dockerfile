FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/
COPY scripts ./scripts/
ENV CI=true

RUN npm ci --workspace=backend

RUN cd backend && npx prisma generate

# Stage 2: builder
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app ./
COPY backend ./backend

RUN npm run build --workspace=backend

# Stage 3: production
FROM node:22-alpine AS production
RUN apk add --no-cache tini
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=deps /app/backend/prisma ./backend/prisma

RUN npm prune --omit=dev --workspace=backend && npm cache clean --force

RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/dist/main"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1