# Social Network (Antigravity) — Documentation

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Docker](#docker)
- [Scripts](#scripts)
- [API Reference](api-reference.md)
- [Real-time Events](real-time-events.md)
- [Database Schema](database-schema.md)
- [Deployment Guide](deployment-guide.md)
- [Testing Guide](testing-guide.md)
- [CI/CD Pipeline](ci/README.md)
- [Code Quality](#code-quality)
- [Conventions](#conventions)
- [ADR](adr/README.md)

---

## Overview

Social Network is a full-stack monorepo application built with:

- **Backend**: NestJS 11 + Prisma 5 + PostgreSQL + Redis + MinIO
- **Frontend**: React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 4
- **Real-time**: Socket.IO for chat/messaging
- **Auth**: JWT access + refresh tokens (argon2 password hashing)
- **Storage**: AWS S3-compatible (MinIO for local/dev, S3 for prod)
- **Observability**: Sentry for error tracking

---

## Documentation Index

| Document                                | Description                           |
| --------------------------------------- | ------------------------------------- |
| [API Reference](api-reference.md)       | Complete HTTP endpoint documentation  |
| [Real-time Events](real-time-events.md) | Socket.IO events for chat/messaging   |
| [Database Schema](database-schema.md)   | Prisma models, relations, enums       |
| [Deployment Guide](deployment-guide.md) | Docker, Vercel, environment variables |
| [Testing Guide](testing-guide.md)       | Unit tests, E2E tests, Lighthouse CI  |
| [CI/CD Pipeline](ci/README.md)          | GitHub Actions workflows              |
| [ADR](adr/README.md)                    | Architecture Decision Records         |

---

## Architecture

### Monorepo Structure

The project uses **npm workspaces** with two packages:

```
social-network/
├── backend/          # NestJS API server
├── frontend/         # React SPA
├── package.json      # Root workspace config
└── package-lock.json # Single lockfile (nested lockfiles removed)
```

### Backend Architecture

- **Framework**: NestJS 11 (modular architecture)
- **ORM**: Prisma 5 with PostgreSQL
- **Cache/Queue**: Redis (ioredis + BullMQ)
- **Real-time**: Socket.IO (gateways for chat)
- **Auth**: JWT (access 15m, refresh 7d) + Passport
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger (@nestjs/swagger)
- **Logging**: Pino (nestjs-pino)
- **File Storage**: @aws-sdk/client-s3 (MinIO-compatible)
- **Image Processing**: Sharp

### Frontend Architecture

- **Framework**: React 19 with TypeScript 6
- **Build Tool**: Vite 8 (Rolldown-based)
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router
- **Forms**: React Hook Form + Zod
- **UI**: Radix UI primitives + Lucide icons
- **Real-time Client**: Socket.IO Client
- **Build Optimization**: React Compiler (babel-plugin-react-compiler)

---

## Project Structure

```
social-network/
├── .github/
│   ├── actions/           # Composite CI actions
│   ├── codeql/            # CodeQL config
│   ├── ISSUE_TEMPLATE/    # Issue templates (bug, feature)
│   ├── workflows/         # CI/CD workflows
│   ├── CODEOWNERS         # Code ownership rules
│   ├── dependabot.yml     # Automated dependency updates
│   ├── labels.yml         # Repository labels definition
│   └── labeler.yml        # Auto-labeling rules
├── .husky/                # Git hooks (pre-commit, pre-push, commit-msg)
├── .agents/               # Agent rules/workflows
├── backend/
│   ├── prisma/            # Prisma schema + migrations
│   ├── src/               # Backend source code
│   │   ├── auth/          # Authentication module
│   │   ├── post/          # Post module
│   │   ├── user/          # User module
│   │   ├── chat/          # Chat/messaging module
│   │   ├── feed/          # Feed module
│   │   └── shared/        # Shared utilities
│   └── test/              # E2E tests
├── docs/                  # Documentation (this folder)
├── frontend/
│   ├── .storybook/        # Storybook config
│   ├── src/
│   │   ├── features/      # Feature-based modules
│   │   ├── shared/        # Shared components, hooks, utils
│   │   └── assets/        # Static assets
│   └── public/            # Public static files
├── scripts/               # Utility scripts
│   ├── postinstall.js     # Post-install (prisma generate)
│   ├── validate-eol.js    # Line-ending validator
│   ├── check-env.js       # Environment variable validator
│   └── clean.js           # Monorepo cleanup
├── docker-compose.dev.yml # Development services
├── docker-compose.prod.yml # Production services
├── package.json           # Root workspace config
├── vercel.json            # Vercel deployment config
└── commitlint.config.js   # Commit message linting rules
```

---

## Development Setup

### Prerequisites

- Node.js >= 22.12.0
- npm >= 10.0.0
- Docker + Docker Compose

### Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd social-network

# 2. Install dependencies
npm ci

# 3. Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your values

# 4. Start development databases (Postgres + Redis + MinIO)
npm run docker:dev:up

# 5. Run migrations
npm run db:migrate -w backend

# 6. Start development servers
npm run dev
```

### Environment Variables

#### Backend (.env)

| Variable           | Description                          | Required |
| ------------------ | ------------------------------------ | -------- |
| DATABASE_URL       | PostgreSQL connection string         | Yes      |
| REDIS_URL          | Redis connection string              | Yes      |
| JWT_ACCESS_SECRET  | JWT access token secret (32+ chars)  | Yes      |
| JWT_REFRESH_SECRET | JWT refresh token secret (32+ chars) | Yes      |
| PORT               | Server port (default: 3000)          | No       |
| CORS_ORIGIN        | Allowed CORS origin                  | Yes      |
| MINIO_ENDPOINT     | MinIO endpoint URL                   | Yes      |
| MINIO_ACCESS_KEY   | MinIO access key                     | Yes      |
| MINIO_SECRET_KEY   | MinIO secret key                     | Yes      |
| MINIO_BUCKET       | MinIO bucket name                    | Yes      |
| SENTRY_DSN         | Sentry DSN (optional)                | No       |

#### Frontend (.env)

| Variable        | Description           | Required |
| --------------- | --------------------- | -------- |
| VITE_API_URL    | Backend API URL       | Yes      |
| VITE_SENTRY_DSN | Sentry DSN (optional) | No       |

---

## Docker

### Development Services

```bash
# Start all dev services
npm run docker:dev:up

# Stop dev services
npm run docker:dev:down

# View logs
npm run docker:dev:logs

# Rebuild services
npm run docker:dev:build
```

Dev services include:

- PostgreSQL 16 (port 5432)
- Redis 7 (port 6379)
- MinIO (ports 9000, 9001)

### Production Services

```bash
# Start production stack
npm run docker:prod:up

# Stop production stack
npm run docker:prod:down
```

Production stack includes all dev services plus:

- Backend API (with Prisma migration runner)
- Frontend (Nginx-served SPA)
- Internal + public Docker networks

---

## Scripts

| Script                     | Description                                    |
| -------------------------- | ---------------------------------------------- |
| `npm run dev`              | Start backend + frontend in dev mode           |
| `npm run dev:backend`      | Start backend dev server only                  |
| `npm run dev:frontend`     | Start frontend dev server only                 |
| `npm run build`            | Build both workspaces                          |
| `npm run lint`             | Lint both workspaces                           |
| `npm run lint:fix`         | Lint + auto-fix both workspaces                |
| `npm run test`             | Run tests for both workspaces                  |
| `npm run test:cov`         | Run tests with coverage                        |
| `npm run test:e2e`         | Run backend E2E tests                          |
| `npm run typecheck`        | TypeScript type checking                       |
| `npm run format`           | Format code with Prettier                      |
| `npm run format:check`     | Check code formatting                          |
| `npm run validate`         | Run all validators (EOL, env, typecheck, lint) |
| `npm run validate:eol`     | Validate line endings (LF)                     |
| `npm run validate:env`     | Validate environment variables                 |
| `npm run clean`            | Clean build artifacts + node_modules           |
| `npm run clean:prune`      | Clean + Docker prune                           |
| `npm run lhci`             | Run Lighthouse CI locally                      |
| `npm run docker:dev:up`    | Start dev Docker services                      |
| `npm run docker:dev:down`  | Stop dev Docker services                       |
| `npm run docker:prod:up`   | Start production Docker stack                  |
| `npm run docker:prod:down` | Stop production Docker stack                   |

---

## CI/CD Pipeline

See [CI Documentation](ci/README.md) for detailed workflow documentation.

### Workflows

| Workflow             | Trigger                  | Purpose                                    |
| -------------------- | ------------------------ | ------------------------------------------ |
| `ci.yml`             | push/PR to main, develop | Main CI pipeline (lint, test, build, scan) |
| `release.yml`        | push to main, develop    | Semantic release + Sentry source maps      |
| `security.yml`       | schedule, push/PR        | npm audit, Trivy scan, Gitleaks            |
| `codeql.yml`         | schedule, push/PR        | CodeQL security analysis                   |
| `pr-title.yml`       | PR opened/edited         | Validate PR title (conventional commits)   |
| `storybook.yml`      | PR with stories          | Build Storybook                            |
| `vercel-preview.yml` | PR (frontend paths)      | Deploy Vercel preview                      |
| `labeler.yml`        | PR opened/sync           | Auto-label PRs by path                     |
| `sync-labels.yml`    | push to main             | Sync repository labels                     |

### CI Pipeline Stages

```
changes → validate-eol → format-check → setup
                                            ↓
                    ┌──→ backend-lint ──→ backend-test (3 shards) ──→ backend-e2e
                    │
                    └──→ frontend-lint ──→ frontend-test ──→ frontend-prod-assessment
                                                                        ↓
                                            docker-build ──────────→ ci-success
```

---

## Code Quality

### Linting

- **Backend**: ESLint 9 + Prettier
- **Frontend**: ESLint 10 + Prettier
- **Config**: Flat config format (ESLint 9+)

### Formatting

- **Tool**: Prettier 3
- **Config**: `.prettierrc.json`
- **Settings**: single quotes, semicolons, trailing commas, LF line endings, 100 char width

### Commit Messages

- **Convention**: Conventional Commits
- **Types**: feat, fix, refactor, chore, docs, style, test, perf, ci, revert, optimization
- **Scopes**: auth, feed, chat, profile, user, post, follow, media, ws, infra, deps, security, backend, frontend

### Git Hooks (Husky)

| Hook       | Command                      |
| ---------- | ---------------------------- |
| pre-commit | Validate EOL → lint-staged   |
| pre-push   | Typecheck backend + frontend |
| commit-msg | commitlint                   |

### Line Endings

- **Policy**: LF everywhere
- **Enforcement**: `.editorconfig`, `.gitattributes`, `scripts/validate-eol.js`
- **CI**: `validate-eol` job checks all tracked files

---

## Conventions

### Branching

- `main` — production releases
- `develop` — beta/prerelease channel
- `feat/*` — feature branches
- `fix/*` — bug fix branches

### Pull Requests

1. Fill out the PR template
2. Ensure CI passes (lint, typecheck, test, format)
3. Required reviewers from CODEOWNERS
4. Conventional commit title (validated by CI)

### Code Review

- Backend changes: @subvincdebian
- Frontend changes: @chupikx228
- Infrastructure: @subvincdebian
- Database migrations: @subvincdebian + @chupikx228
