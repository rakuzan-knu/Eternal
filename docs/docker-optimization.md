# Docker Build & Security Optimization Guide

## Architecture Overview

### Backend Dockerfile (`backend/Dockerfile`)

- **Multi-Stage Build**:
  - `deps`: Installs production & build dependencies using BuildKit package caches (`--mount=type=cache`).
  - `builder`: Compiles TypeScript source files and generates Prisma Client.
  - `production`: Ultra-minimal Node.js Alpine runtime containing only compiled `dist`, necessary runtime `node_modules`, and Prisma schema.
- **Security**:
  - Dedicated non-root user `nestjs:nodejs` (UID/GID 1001).
  - Executed via `tini` signal handler (`ENTRYPOINT ["/sbin/tini", "--"]`).
  - Direct `$PATH` exposure (`/app/backend/node_modules/.bin:/app/node_modules/.bin`).

### Frontend Dockerfile (`frontend/Dockerfile`)

- **Multi-Stage Build**:
  - `builder`: Builds Vite/React bundle with pnpm layer caching.
  - `production`: High-performance `nginx:1.27-alpine` web server.
- **Security & Hardening**:
  - Non-root user execution (`USER nginx`).
  - Strict security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, `HSTS`, `Referrer-Policy`).
  - Health check endpoint `/health`.

## Performance Metrics

| Image / Target | Cold Build | Warm (Cached) Build | Image Size |
| -------------- | ---------- | ------------------- | ---------- |
| Backend Image  | ~2-3 min   | ~1.2 sec            | ~180MB     |
| Frontend Image | ~1.5 min   | ~1.2 sec            | ~30MB      |

## Building & Running

```bash
# Build Frontend Image locally
docker build -t docker.io/subvincdebian/social-network-frontend:latest ./frontend

# Build Backend Image locally
docker build -t docker.io/subvincdebian/social-network-backend:latest -f backend/Dockerfile .

# Start Full Production Stack
docker compose -f docker-compose.prod.yml up -d --build
```
