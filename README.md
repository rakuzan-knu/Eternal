# 🌐 Social Network

A modern, high-performance **Social Network Application** built as a monorepo using **npm workspaces**. Powered by **NestJS** on the backend and **React + Vite** on the frontend.

---

## 🛠️ Tech Stack

### 🟦 Back-End (NestJS)
* **Framework:** NestJS (Modular Architecture)
* **API Documentation:** Swagger
* **Database & Caching:** PostgreSQL, Redis, Prisma ORM
* **Real-time Communication:** Socket.io
* **Auth & Security:** Passport.js + JWT, Argon2 hashing, `class-validator`, Helmet, CORS, NestJS Throttler (rate limiting)
* **File Processing & Storage:** MINIO
* **Asynchronous Jobs & Queues:** BullMQ
* **Logging:** Pino (`nestjs-pino`)

### 🟩 Front-End (React + Vite)
* **Core & Build Tools:** React, Vite, React Compiler
* **Styling & UI:** Tailwind CSS
* **State Management:** TanStack Query (Server State), Zustand (Client State)
* **Routing:** React Router 7
* **Form Handling & Validation:** React Hook Form, Zod
* **Real-time Client:** Socket.io Client
* **Testing:** Vitest, React Testing Library

### 🟨 Infrastructure & DevOps
* **Monorepo Management:** npm Workspaces (`packageManager: npm@10.9.0`)
* **Containerization:** Docker
* **CI/CD & Release:** GitHub Actions, `@commitlint`, `lint-staged`, `husky`, `semantic-release`

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
├── .npmrc                   # NPM engine-strict & workspace behavior setup
├── .nvmrc                   # Project target Node.js version
├── .prettierignore          # Prettier formatting exclusion rules
├── .prettierrc.json         # Prettier code style configuration
├── CHANGELOG.md             # Auto-generated release history & release notes
├── commitlint.config.js     # Conventional Commits validation rules
├── CONTRIBUTING.MD          # Development workflow, branch & commit standards
├── docker-compose.dev.yml   # Local development Docker environment
├── docker-compose.prod.yml  # Production Docker deployment setup
├── package-lock.json        # Dependency tree lockfile
├── package.json             # Monorepo root scripts & workspaces setup
├── README.md                # Main project overview & onboarding guide
└── release.config.js        # Semantic release & tagging configuration
```

---

## ⚙️ Prerequisites

Ensure your system meets the minimum requirements specified in `package.json`:

* **Node.js:** `>=20.18.0`
* **npm:** `>=10.0.0` (Recommended: `npm@10.9.0`)

> ⚠️ Note: `npm install` enforces strict Node engine checks (`engine-strict=true`). Make sure to use the correct Node version (`nvm use`).

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
Run `npm install` in the **root directory**. This will install dependencies for all workspaces (`backend` and `frontend`) and run automated setup hooks (e.g., `prisma generate`, `husky`).

```bash
nvm use
npm install
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
npm run dev
```

Or start workspaces individually:
```bash
# Backend only (NestJS dev mode)
npm run dev:backend

# Frontend only (Vite dev mode)
npm run dev:frontend
```

---

## 📜 Available Root Scripts

All root commands execute across both `backend` and `frontend` workspaces:

| Script                 | Description                                                |
| :---                   | :---                                                       |
| `npm run dev`          | Runs backend and frontend concurrently in development mode |
| `npm run dev:backend`  | Starts NestJS server in watch mode                         |
| `npm run dev:frontend` | Starts Vite frontend dev server                            |
| `npm run build`        | Builds both backend and frontend for production            |
| `npm run lint`         | Runs ESLint check across all workspaces                    |
| `npm run lint:fix`     | Fixes ESLint errors automatically across workspaces        |
| `npm run format`       | Formats codebase using Prettier                            |
| `npm run typecheck`    | Validates TypeScript types without emitting files          |
| `npm run test`         | Runs unit tests for backend and frontend                   |
| `npm run test:cov`     | Generates unit test coverage reports                       |
| `npm run test:e2e`     | Runs E2E tests for the backend workspace                   |

---

## 🧹 Code Quality & Git Hooks

We enforce high code quality standard prior to every commit and pull request:

* **Husky & lint-staged:** Runs ESLint and Prettier on staged files before every commit.
* **Commitlint:** Validates commit messages to comply with Conventional Commits rules.
* **PR Title Lint:** Validates Pull Request titles via GitHub Actions.

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