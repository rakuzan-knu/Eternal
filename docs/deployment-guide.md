# Deployment Guide

## Overview

This project supports multiple deployment targets:

- **Frontend**: Vercel (static SPA)
- **Backend**: Docker container or Vercel Serverless
- **Database**: PostgreSQL (managed or self-hosted)
- **Cache/Queue**: Redis (managed or self-hosted)
- **Object Storage**: MinIO (self-hosted) or AWS S3 (production)

---

## Docker Deployment

### Development

```bash
# Start all development services
pnpm run docker:dev:up

# Services started:
# - PostgreSQL 16 (port 5432)
# - Redis 7 (port 6379)
# - MinIO (ports 9000, 9001)
```

### Production

Production deployment uses Docker Compose with the full stack:

- PostgreSQL
- Redis
- MinIO
- Backend API (NestJS)
- Frontend (Nginx-served SPA)

```bash
# Set environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with production values

# Start production stack
pnpm run docker:prod:up
```

### Building Images

```bash
# Build backend
docker build -t social-network-backend:latest ./backend

# Build frontend
docker build -t social-network-frontend:latest ./frontend
```

---

## Environment Variables

### Backend

| Variable            | Required | Description                          |
| ------------------- | -------- | ------------------------------------ |
| DATABASE_URL        | Yes      | PostgreSQL connection string         |
| REDIS_URL           | Yes      | Redis connection string              |
| JWT_ACCESS_SECRET   | Yes      | Access token secret (32+ chars)      |
| JWT_REFRESH_SECRET  | Yes      | Refresh token secret (32+ chars)     |
| JWT_ACCESS_TTL      | No       | Access token TTL (default: 15m)      |
| JWT_REFRESH_TTL     | No       | Refresh token TTL (default: 7d)      |
| PORT                | No       | Server port (default: 3000)          |
| CORS_ORIGIN         | Yes      | Comma-separated allowed origins      |
| NODE_ENV            | No       | Environment (development/production) |
| MINIO_ENDPOINT      | Yes      | MinIO/S3 endpoint                    |
| MINIO_PORT          | No       | MinIO port (default: 9000)           |
| MINIO_ROOT_USER     | Yes      | MinIO/S3 access key                  |
| MINIO_ROOT_PASSWORD | Yes      | MinIO/S3 secret key                  |
| S3_BUCKET_AVATARS   | Yes      | Avatar bucket name                   |
| SENTRY_DSN          | No       | Sentry error tracking DSN            |

### Frontend

| Variable        | Required | Description               |
| --------------- | -------- | ------------------------- |
| VITE_API_URL    | Yes      | Backend API base URL      |
| VITE_SENTRY_DSN | No       | Sentry error tracking DSN |

---

## Database Migrations

### Development

```bash
# Create and apply migration
pnpm --filter backend db:migrate

# Open Prisma Studio (database GUI)
pnpm --filter backend db:studio
```

### Production

```bash
# Apply existing migrations
pnpm --filter backend exec prisma migrate deploy

# Or via Docker (runs automatically)
docker compose -f docker-compose.prod.yml up prisma-migrate
```

---

## Vercel Deployment

The frontend is configured for Vercel deployment via `vercel.json`:

```json
{
  "buildCommand": "pnpm --filter frontend build",
  "outputDirectory": "frontend/dist",
  "installCommand": "pnpm install",
  "framework": "vite"
}
```

### Environment Variables (Vercel)

Set these in your Vercel project settings:

| Variable        | Value                |
| --------------- | -------------------- |
| VITE_API_URL    | Your backend API URL |
| VITE_SENTRY_DSN | (optional)           |

### Preview Deployments

Every pull request to `main` or `develop` with frontend changes triggers an automatic preview deployment.

---

## Monitoring

### Sentry

Sentry is integrated for error tracking:

- **Backend**: `@sentry/nestjs`
- **Frontend**: `@sentry/react` (configured via `VITE_SENTRY_DSN`)

Source maps are uploaded during release for readable stack traces.

### Health Check

The backend exposes a health endpoint:

```
GET /health
```

Returns status of database and Redis connections.

---

## Scaling

### Backend

The backend supports horizontal scaling:

- Stateless JWT authentication (no session stickiness required)
- Redis for shared refresh token storage
- Can run multiple replicas behind a load balancer

### Database

- Use connection pooling (PgBouncer or similar) for high-traffic scenarios
- Consider read replicas for read-heavy endpoints

### File Storage

- MinIO can be deployed in distributed mode for high availability
- Migrate to AWS S3 for production workloads

---

## Troubleshooting

### Migration Failures

```bash
# Reset database (development only!)
pnpm --filter backend exec prisma migrate reset

# Resolve migration conflicts
pnpm --filter backend exec prisma migrate resolve --applied <migration_name>
```

### Docker Issues

```bash
# Rebuild containers
pnpm run docker:dev:build

# View logs
pnpm run docker:dev:logs

# Clean up
pnpm run clean:prune
```

### Build Failures

```bash
# Clean and reinstall
pnpm run clean
pnpm install

# Rebuild
pnpm run build
```
