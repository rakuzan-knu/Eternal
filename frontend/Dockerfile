FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY scripts ./scripts/

ENV CI=true

RUN npm ci --workspace=frontend

# Stage 2: builder
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app ./
COPY frontend ./frontend

ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --workspace=frontend

# Stage 3: production
FROM nginx:1.27-alpine AS production

COPY frontend/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:80/health || exit 1