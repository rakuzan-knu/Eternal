# 🌐 Social Network

A modern, high-performance **Social Network Application** built as a monorepo using **pnpm workspaces**. Powered by **NestJS** on the backend and **React + Vite** on the frontend.

---

## 🛠️ Tech Stack

### 🟦 Back-End (NestJS)

- **Framework:** NestJS (Modular Architecture, Fastify adapter)
- **Validation & Contracts:** Single-Source-of-Truth Zod Contracts (`@common/contracts`), Custom `ZodValidationPipe` (zero `class-validator`)
- **API Documentation:** Swagger OpenAPI
- **BFF & Feature Management:** Dedicated BFF Aggregators (`/api/v1/feed/compact`), Dynamic Redis + In-Memory Feature Flags engine (`@FeatureFlag()` guard)
- **Database & Caching:** PostgreSQL 16, Redis 7, Prisma ORM (`@common/prisma`), `waveform Int[]` voice visualization
- **Real-time Communication:** Socket.io `/messenger` gateway & WebRTC P2P Mesh signalling relay (`voice:mesh-*`)
- **Auth & Security:** Passport.js + JWT, Argon2 hashing, Helmet, Strict CORS, NestJS Throttler
- **File Processing & Storage:** MINIO / S3, OffscreenCanvas client pre-compression
- **Asynchronous Jobs & Queues:** BullMQ
- **Observability & Tracing:** Correlation ID middleware (`x-correlation-id`), Prometheus Metrics (`prom-client`), Sentry error tracking, Pino structured logging

### 🟩 Front-End (React + Vite)

- **Core & Build Tools:** React 19, Vite 6, React Compiler
- **Architecture:** Feature-Sliced Design (FSD)
- **Styling & UI:** Tailwind CSS 4
- **State Management & Local-First:** TanStack Query 5 with IndexedDB persistence (`idb-keyval`), Zustand (Client State), Persistent Mutation Outbox Queue (offline-first sync with idempotency keys)
- **Voice & Media Engines:** Web Worker image compressor (`OffscreenCanvas`), Real-time interactive waveform voice analyser & scrub physics, P2P WebRTC Mesh voice channels (Discord-style $0 server media bandwidth)
- **Privacy & Encryption:** Pure WebCrypto API (ECDH P-256 + AES-GCM-256) E2EE, TOFU key pinning, Secret Chat verification modal with SAS safety emojis
- **Routing:** React Router 7
- **Form Handling & Validation:** React Hook Form + Zod
- **Real-time Client:** Socket.io Client + WebRTC Peer Connections
- **Type Integration:** Direct backend contract consumption (`@backend/common/contracts`)

### 🟨 Infrastructure & DevOps

- **Monorepo Management:** pnpm Workspaces + **Nx** (`nx.json`, task graph & affected execution)
- **Test Suite:** **Vitest 3 + `unplugin-swc`** unified monorepo workspace (Rust compiler, ~10-15x faster than Jest + `ts-jest`), isolated single-fork database E2E runner
- **Supply Chain Security:** Cosign keyless artifact signing, CycloneDX SBOM generation, Trivy container scanning, strict `allowScripts` lockdown
- **Containerization:** Docker (multi-stage non-root images with BuildKit cache mounts and parallel package builds)
- **CI/CD & Release:** GitHub Actions (matrix sharded, PR build de-duplication, zero-overhead container smoke test), `@commitlint`, `lint-staged`, `husky`, `semantic-release`

---

## 📁 Project Structure

```text
social-network/
├── .agents/                 # AI Agent rules & workspace custom guidelines
├── .github/                 # CI/CD Workflows, PR templates & CODEOWNERS
├── .husky/                  # Git hooks (commit-msg, pre-commit, pre-push)
├── backend/                 # NestJS API application & Prisma schema
├── frontend/                # React + Vite application (Feature-Sliced Design)
├── docs/                    # Technical documentation, architecture & runbooks
├── scripts/                 # CI/CD, deploy, db, bench, secrets & utility scripts
├── .dockerignore            # Docker build exclusion rules
├── .editorconfig            # Cross-editor indentation & formatting rules
├── .gitattributes          # Git line endings (LF) normalization settings
├── .gitignore               # Git ignore patterns
├── .lighthouserc.json       # Lighthouse CI frontend performance configuration
├── .npmrc                   # NPM engine-strict setup
├── .nvmrc                   # Project target Node.js version
├── .pnpmrc                  # PNPM hoist & workspace behavior setup
├── .prettierignore          # Prettier formatting exclusion rules
├── .prettierrc.json         # Prettier code style configuration
├── CHANGELOG.md             # Auto-generated release history & release notes
├── commitlint.config.js     # Conventional Commits validation rules
├── CONTRIBUTING.MD          # Development workflow, branch & commit standards
├── docker-compose.dev.yml   # Local development Docker environment
├── docker-compose.prod.yml  # Production Docker deployment setup
├── package.json             # Monorepo root scripts & packageManager setup
├── pnpm-lock.yaml           # PNPM dependency tree lockfile
├── pnpm-workspace.yaml      # PNPM workspace definition & shared overrides
├── README.md                # Main project overview & onboarding guide
└── release.config.cjs       # Semantic release & tagging configuration
```

---

## ⚙️ Prerequisites

Ensure your system meets the minimum requirements specified in `package.json`:

- **Node.js:** `>=24.11.0`
- **pnpm:** `>=10.0.0` (Recommended: `pnpm@10.5.2`)

> ⚠️ Note: `pnpm install` enforces strict Node engine checks (`engine-strict=true`). Make sure to use the correct Node version (`nvm use`).

---

## 📚 Documentation

Detailed documentation, architecture deep dives, API specs, and runbooks are available in the [`docs/`](./docs/README.md) directory:

- 🏛️ **[System Architecture](./docs/architecture/README.md)** — C4 topology, monorepo design, data flow
- ⚙️ **[Backend Architecture](./docs/architecture/backend.md)** — NestJS 11 + Fastify, 4-tier layering & BullMQ
- 🎨 **[Frontend Architecture](./docs/architecture/frontend.md)** — React 19 + Feature-Sliced Design & TanStack Query
- 🗄️ **[Database Architecture & ERD](./docs/architecture/database.md)** — PostgreSQL 16 schema & relational models
- ⚡ **[Real-time WebSocket Gateway](./docs/architecture/realtime.md)** & **[WebSocket Protocol](./docs/api/websocket.md)** — Socket.IO `/messenger` gateway & events
- 🔐 **[Security & Privacy Architecture](./docs/architecture/security.md)** — Auth, Argon2, E2EE, rate limiting & Cosign
- 📡 **[REST API Reference](./docs/api/http-api.md)** & **[Zod Contracts](./docs/api/contracts.md)**
- 🤝 **[Contributor Guide](./docs/contributing/README.md)** & **[Contribution Workflow](./docs/contributing/workflow.md)**
- 🧪 **[Testing Handbook](./docs/contributing/testing.md)** — Vitest 3 (Backend & Frontend), E2E runner, Stryker & k6
- 🚀 **[Deployment Guides](./docs/deployment/README.md)** — Multi-stage Docker & Cloud environments
- ⚙️ **[Operations & SRE Handbook](./docs/operations/README.md)** — Resilience, zero-downtime migrations & SLAs
- 📖 **[Operational Runbooks](./docs/runbooks/README.md)** — SRE emergency playbooks & incident triage

---

## 📄 License

This project is licensed under the [AGPL-3.0 License](./LICENSE).

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd social-network
```

### 2. Install dependencies

Run `pnpm install` in the **root directory**. This will install dependencies for all workspaces (`backend` and `frontend`) and run automated setup hooks (e.g., `prisma generate`, `husky`).

```bash
nvm use
pnpm install
```

### 3. Environment Variables

Copy `.env.example` files in both workspace directories and configure your environment variables:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 4. Start Local Infrastructure (Docker)

Start PostgreSQL 16, Redis 7, and MinIO storage in the background:

```bash
# Start local containers (PostgreSQL, Redis, MinIO)
pnpm docker:dev:up

# Push Prisma schema migrations to PostgreSQL
pnpm --filter backend db:migrate
```

### 5. Run Development Servers

Start **both backend and frontend** simultaneously:

```bash
pnpm dev
```

Or start workspaces individually:

```bash
# Backend only (NestJS dev mode)
pnpm dev:backend

# Frontend only (Vite dev mode)
pnpm dev:frontend
```

---

## 📜 Available Root Scripts

All root commands execute across both `backend` and `frontend` workspaces:

| Script                 | Description                                                      |
| :--------------------- | :--------------------------------------------------------------- |
| `pnpm dev`             | Runs backend and frontend concurrently in development mode       |
| `pnpm dev:backend`     | Starts NestJS server in watch mode                               |
| `pnpm dev:frontend`    | Starts Vite frontend dev server                                  |
| `pnpm docker:dev:up`   | Starts local dev services (Postgres, Redis, MinIO) in background |
| `pnpm docker:dev:down` | Stops local dev services                                         |
| `pnpm docker:dev:logs` | Streams real-time logs from dev services                         |
| `pnpm docker:clean`    | Stops containers and purges all data volumes                     |
| `pnpm build`           | Builds both backend and frontend for production                  |
| `pnpm lint`            | Runs ESLint check across all workspaces                          |
| `pnpm lint:fix`        | Fixes ESLint errors automatically across workspaces              |
| `pnpm format`          | Formats codebase using Prettier                                  |
| `pnpm typecheck`       | Validates TypeScript types without emitting files                |
| `pnpm test`            | Runs all tests in monorepo via unified Vitest 3 workspace runner |
| `pnpm test:backend`    | Runs backend test suite via Vitest project runner                |
| `pnpm test:frontend`   | Runs frontend test suite via Vitest project runner               |
| `pnpm test:cov`        | Generates unit & integration test coverage via v8                |
| `pnpm test:e2e`        | Runs isolated single-fork database E2E tests for backend         |

---

## 🧹 Code Quality & Git Hooks

We enforce high code quality standard prior to every commit and pull request:

- **Husky & lint-staged:** Runs ESLint and Prettier on staged files before every commit.
- **Commitlint:** Validates commit messages to comply with Conventional Commits rules.
- **PR Title Lint:** Validates Pull Request titles via GitHub Actions.

> ❌ **Never** use `git commit --no-verify` to bypass pre-commit hooks.

---

## ⏱️ The 1-Hour Rule

If you are stuck on a technical blocker or issue for **more than 1 hour**:

1. Pause your investigation.
2. Summarize what you have tried, error logs, and relevant context.
3. Reach out to the team in **Team Chat** or tag your mentor/tech lead.

Don't stay blocked—communication keeps the velocity high! 🚀

---

## 🤝 Contributing

Before contributing, please read our detailed [CONTRIBUTING.md](./CONTRIBUTING.md) and [Contribution Workflow](./docs/contributing/workflow.md) covering:

- GitHub Issues and proposal workflow
- Git branch naming conventions (`feat/<issue>-...`, `fix/<issue>-...`)
- Commit message guidelines & scope rules
- Architectural standards (NestJS 4-Tier & Feature-Sliced Design)
- Pull Request approval guidelines and automated release flow
