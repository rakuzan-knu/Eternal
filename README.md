# 🌐 Social Network

A modern, high-performance **Social Network Application** built as a monorepo using **pnpm workspaces**. Powered by **NestJS** on the backend and **React + Vite** on the frontend.

---

## 🛠️ Tech Stack

### 🟦 Back-End (NestJS)

- **Framework:** NestJS (Modular Architecture)
- **Validation & Contracts:** Single-Source-of-Truth Zod Contracts (`@common/contracts`), Custom `ZodValidationPipe` (zero `class-validator`)
- **API Documentation:** Swagger OpenAPI
- **Database & Caching:** PostgreSQL, Redis, Prisma ORM (`@common/prisma`)
- **Real-time Communication:** Socket.io
- **Auth & Security:** Passport.js + JWT, Argon2 hashing, Helmet, Strict CORS, NestJS Throttler
- **File Processing & Storage:** MINIO / S3
- **Asynchronous Jobs & Queues:** BullMQ
- **Observability & Tracing:** Correlation ID middleware (`x-correlation-id`), Prometheus Metrics (`prom-client`), Sentry error tracking, Pino structured logging

### 🟩 Front-End (React + Vite)

- **Core & Build Tools:** React 19, Vite, React Compiler
- **Architecture:** Feature-Sliced Design (FSD)
- **Styling & UI:** Tailwind CSS
- **State Management:** TanStack Query (Server State), Zustand (Client State)
- **Routing:** React Router 7
- **Form Handling & Validation:** React Hook Form + Zod
- **Real-time Client:** Socket.io Client
- **Type Integration:** Direct backend contract consumption (`@backend/common/contracts`)

### 🟨 Infrastructure & DevOps

- **Monorepo Management:** pnpm Workspaces + **Nx** (`nx.json`, task graph & affected execution)
- **Supply Chain Security:** Cosign keyless artifact signing, CycloneDX SBOM generation, Trivy container scanning, strict `allowScripts` lockdown
- **Containerization:** Docker (multi-stage non-root images)
- **CI/CD & Release:** GitHub Actions, `@commitlint`, `lint-staged`, `husky`, `semantic-release`

---

## 📁 Project Structure

```text
social-network/
├── .agents/                 # AI Agent rules & workspace custom guidelines
├── .github/                 # CI/CD Workflows, PR templates & CODEOWNERS
├── .husky/                  # Git hooks (commit-msg, pre-commit, pre-push)
├── backend/                 # NestJS API application & Prisma schema
├── frontend/                # React + Vite application (Feature-Sliced Design)
├── scripts/                 # Root maintenance & postinstall scripts
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
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 4. Run Development Servers

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

| Script              | Description                                                |
| :------------------ | :--------------------------------------------------------- |
| `pnpm dev`          | Runs backend and frontend concurrently in development mode |
| `pnpm dev:backend`  | Starts NestJS server in watch mode                         |
| `pnpm dev:frontend` | Starts Vite frontend dev server                            |
| `pnpm build`        | Builds both backend and frontend for production            |
| `pnpm lint`         | Runs ESLint check across all workspaces                    |
| `pnpm lint:fix`     | Fixes ESLint errors automatically across workspaces        |
| `pnpm format`       | Formats codebase using Prettier                            |
| `pnpm typecheck`    | Validates TypeScript types without emitting files          |
| `pnpm test`         | Runs unit tests for backend and frontend                   |
| `pnpm test:cov`     | Generates unit test coverage reports                       |
| `pnpm test:e2e`     | Runs E2E tests for the backend workspace                   |

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

Before contributing, please read our detailed [CONTRIBUTING.md](./CONTRIBUTING.md) guide covering:

- Jira task workflow
- Git branch naming conventions (`feat/SOC-XXX-...`, `fix/SOC-XXX-...`)
- Commit message guidelines & scope rules
- Architectural standards (NestJS Modules & Feature-Sliced Design)
- Pull Request approval guidelines and automated release flow
