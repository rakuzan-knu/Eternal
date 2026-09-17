# 🚀 Contributor Getting Started Guide

Welcome to the **Social Network** open-source project! This guide will walk you through setting up a complete local development environment from scratch in under 5 minutes.

---

## 💻 Prerequisites

Ensure your development machine meets the required versions:

| Tool        | Required Version | Recommended             | Verification Command |
| :---------- | :--------------- | :---------------------- | :------------------- |
| **Node.js** | `>= 24.11.0`     | `24.11.0` (LTS)         | `node -v`            |
| **pnpm**    | `>= 10.0.0`      | `10.5.2`                | `pnpm -v`            |
| **Docker**  | `>= 24.0`        | Docker Desktop / Colima | `docker -v`          |
| **Git**     | `>= 2.30`        | Latest                  | `git -v`             |

> [!TIP]
> Use [nvm](https://github.com/nvm-sh/nvm) (macOS/Linux) or [nvm-windows](https://github.com/coreybutler/nvm-windows) to easily switch Node versions:
>
> ```bash
> nvm use
> ```

---

## 🛠️ Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/rakuzan-knu/social-network.git
cd social-network
```

### 2. Install Workspace Dependencies

The monorepo uses **pnpm workspaces** with strict engine enforcement:

```bash
pnpm install
```

_(This automatically triggers `scripts/utils/postinstall.js` and initializes Git pre-commit hooks via Husky)._

### 3. Configure Environment Variables

Copy the template configuration files:

```bash
# Root environment variables
cp .env.example .env

# Backend environment variables
cp backend/.env.example backend/.env
```

The defaults in `.env.example` are pre-configured to work out of the box with the local Docker Compose services.

### 4. Boot Local Infrastructure (Docker Compose)

Start PostgreSQL, Redis, and MinIO in the background:

```bash
pnpm docker:dev:up
```

Verify services are healthy:

- **PostgreSQL 16**: `localhost:5432`
- **Redis 7**: `localhost:6379`
- **MinIO Storage**: `localhost:9000` (Console at `http://localhost:9001`, user: `minioadmin`, pass: `minioadmin`)

### 5. Run Database Migrations & Generate Prisma Client

```bash
# Push schema migrations to local Postgres
pnpm --filter backend db:migrate

# Generate latest Prisma Client types
pnpm --filter backend db:generate
```

### 6. Start Development Servers

Run both backend and frontend concurrently with hot-reloading:

```bash
pnpm dev
```

- **Frontend (Vite SPA)**: [http://localhost:5173](http://localhost:5173)
- **Backend API (Fastify)**: [http://localhost:3000/api](http://localhost:3000/api)
- **Swagger Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 🧪 Verification Commands

Before creating your first pull request, verify that all validation checks pass:

```bash
# 1. Typecheck entire monorepo
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Verify code formatting
pnpm format:check

# 4. Run full test suite
pnpm test
```

---

## 💡 Pro-Tips for Contributors

- **Prisma Studio**: Inspect and edit local database rows in an interactive web GUI:
  ```bash
  pnpm --filter backend db:studio
  ```
- **Reset Local Database**: To start fresh with a clean database:
  ```bash
  pnpm docker:clean
  pnpm docker:dev:up
  pnpm --filter backend db:migrate
  ```
- **Run Backend Only**: `pnpm dev:backend`
- **Run Frontend Only**: `pnpm dev:frontend`
