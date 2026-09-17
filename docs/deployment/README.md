# 🚀 Deployment Overview & Environment Matrix

The Social Network platform is designed for flexible, resilient deployment across multi-cloud, containerized, and serverless environments.

---

## 📑 Deployment Guides Index

| Guide                                               | Target Environment                      | Key Highlights                                                                  |
| :-------------------------------------------------- | :-------------------------------------- | :------------------------------------------------------------------------------ |
| **[Docker Build & Security Hardening](docker.md)**  | Self-hosted, Docker Compose, Kubernetes | Multi-stage Alpine images, non-root user, BuildKit caching, Tini process reaper |
| **[Managed Cloud Deployment](cloud.md)**            | Production Cloud (Vercel + Render + DB) | Edge React SPA, persistent Fastify WebSockets, UptimeRobot keepalive            |
| **[GitOps & Infrastructure Automation](gitops.md)** | AWS ECS, RDS, S3 via Terraform          | Keyless GitHub Actions OIDC role assumption, automated PR plan generation       |
| **[Zero-Downtime Rollouts](canary-blue-green.md)**  | Production traffic shifting             | Canary deployments, Blue-Green swaps, automated traffic rollback                |

---

## 🎯 Supported Deployment Topologies

```mermaid
graph TD
    subgraph SelfHosted["1. Self-Hosted / On-Premise"]
        Compose[Docker Compose Prod Stack<br/>Postgres + Redis + MinIO + Backend + Nginx SPA]
    end

    subgraph HybridCloud["2. Managed Cloud (Production Default)"]
        Vercel[Vercel<br/>React 19 SPA]
        Render[Render.com / AWS ECS<br/>NestJS Fastify API]
        CloudDB[(TiDB Cloud / AWS RDS<br/>Managed PostgreSQL)]
        CloudRedis[(Upstash / AWS ElastiCache<br/>Redis 7)]
        S3Bucket[(AWS S3 / Cloudflare R2<br/>Object Storage)]
    end

    Cloudflare[Cloudflare Anycast CDN & WAF] --> Vercel
    Cloudflare --> Render
    Render --> CloudDB
    Render --> CloudRedis
    Render --> S3Bucket
```

| Topology          | Best For                      | Ingress / Frontend      | Backend           | Database & Caching             | Storage                |
| :---------------- | :---------------------------- | :---------------------- | :---------------- | :----------------------------- | :--------------------- |
| **Cloud Managed** | Production, High Availability | Vercel (Edge SPA)       | Render / AWS ECS  | AWS RDS / Neon + Redis         | AWS S3 / Cloudflare R2 |
| **Self-Hosted**   | Private servers, Homelabs     | Nginx Container         | Fastify Container | Containerized Postgres + Redis | MinIO Container        |
| **Local Dev**     | Development & E2E Testing     | Vite Dev Server (:5173) | Fastify (:3000)   | Docker Compose Dev             | Local MinIO            |

---

## ⚙️ Environment Variables Matrix

All configuration is strictly validated on startup using Zod in `backend/src/config/`.

| Variable                | Description                                | Required in Prod | Default / Example                                         |
| :---------------------- | :----------------------------------------- | :--------------- | :-------------------------------------------------------- |
| `NODE_ENV`              | Runtime environment mode                   | Yes              | `production` / `development`                              |
| `PORT`                  | API HTTP port                              | No               | `3000`                                                    |
| `DATABASE_URL`          | PostgreSQL connection string               | **Yes**          | `postgresql://user:pass@host:5432/dbname?schema=public`   |
| `REDIS_URL`             | Redis connection URL                       | **Yes**          | `redis://:pass@host:6379/0`                               |
| `JWT_SECRET`            | 256-bit symmetric key for access tokens    | **Yes**          | Random 64-char hex string                                 |
| `REFRESH_TOKEN_SECRET`  | Secret key for refresh tokens              | **Yes**          | Random 64-char hex string                                 |
| `CORS_ORIGIN`           | Allowed web origins (comma-separated)      | **Yes**          | `https://socialnetwork.dev,https://app.socialnetwork.dev` |
| `S3_ENDPOINT`           | Custom S3 endpoint URL (if using MinIO/R2) | Optional         | `https://s3.us-east-1.amazonaws.com`                      |
| `S3_BUCKET`             | Primary media object storage bucket        | **Yes**          | `social-network-media-prod`                               |
| `S3_ACCESS_KEY`         | S3 Access Key ID                           | **Yes**          | `AKIA...`                                                 |
| `S3_SECRET_KEY`         | S3 Secret Access Key                       | **Yes**          | `wJalrXUtn...`                                            |
| `S3_REGION`             | S3 AWS region                              | **Yes**          | `us-east-1`                                               |
| `GITHUB_CLIENT_ID`      | GitHub OAuth Application Client ID         | Optional         | `Iv1.abc123xyz`                                           |
| `GITHUB_CLIENT_SECRET`  | GitHub OAuth Application Client Secret     | Optional         | `789abc456def...`                                         |
| `BACKUP_ENCRYPTION_KEY` | AES-256 passphrase for backup dumps        | **Yes**          | Secure passphrase                                         |

---

## 🩺 Orchestration Health Probes

Orchestrators (Kubernetes, Render, AWS ECS, Docker Compose) should monitor these endpoints:

- **Liveness Probe**: `GET /api/health/liveness`
  - Returns `200 OK` if the process event loop is responsive.
- **Readiness Probe**: `GET /api/health`
  - Returns `200 OK` only when connections to PostgreSQL, Redis, and MinIO/S3 are active.
