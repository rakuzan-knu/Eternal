# 🤝 Open-Source Contributing Guide

Welcome to the **Social Network** open-source project! We are thrilled to have community contributors join us in building a fast, scalable, and private social platform.

> [!TIP]
> **Essential Reading for Contributors:**
>
> - 🚀 **[Local Getting Started Guide](./docs/contributing/getting-started.md)**: 5-minute setup with Docker, pnpm, and Prisma.
> - 🌿 **[Contribution & PR Workflow](./docs/contributing/workflow.md)**: Step-by-step guide to finding issues, branching, and PR lifecycle.
> - 📐 **[Coding Standards & Architecture Invariants](./docs/contributing/coding-standards.md)**: 4-tier backend layering, React FSD, Zod contracts.
> - 🧪 **[Testing Handbook](./docs/contributing/testing.md)**: How to run backend E2E, Vitest integration, and mutation tests.
> - 🏛️ **[Full Architecture Documentation](./docs/README.md)**: System topology, C4 model, database schema, and security model.

---

## 💡 Reporting Issues & Feature Proposals

We track all work transparently on GitHub:

- [🐛 Bug Report](https://github.com/rakuzan-knu/social-network/issues/new?template=bug_report.md)
- [🚀 Feature Request](https://github.com/rakuzan-knu/social-network/issues/new?template=feature_request.md)
- [💬 Discussions](https://github.com/rakuzan-knu/social-network/discussions) for architecture questions and ideas.

---

## 🌿 1. Git Workflow & Branching

We use a standard **Feature Branch Workflow**:

- Branch off `main` (stable production) or `develop` (active development / beta).
- Direct pushes to protected branches (`main`, `develop`) are forbidden.
- All modifications arrive via **Pull Requests**.

### Branch Naming Convention

```text
<type>/<issue-number>-<short-description>
```

Or for minor tasks:

```text
<type>/<short-description>
```

| Type        | Purpose                                   | Example                          |
| :---------- | :---------------------------------------- | :------------------------------- |
| `feat/`     | New features or capabilities              | `feat/124-like-post-realtime`    |
| `fix/`      | Bug fixes and patches                     | `fix/89-auth-token-refresh`      |
| `refactor/` | Code refactoring without behavior changes | `refactor/user-profile-widget`   |
| `perf/`     | Performance optimizations                 | `perf/feed-composite-indices`    |
| `docs/`     | Documentation additions or updates        | `docs/websocket-protocol-guide`  |
| `chore/`    | Tooling, dependencies, or maintenance     | `chore/update-pnpm-dependencies` |

---

## 💬 2. Commit Message Convention

We strictly adhere to **Conventional Commits**, enforced locally by Husky & Commitlint, and validated in CI:

```text
<type>(<scope>): <short description>
```

### Constraints:

- **Subject Length**: ≤ 100 characters.
- **Body Line Length**: ≤ 200 characters per line.
- **Imperative Mood**: e.g., "add", not "added" or "adds".

### Types & Release Impact:

| Type       | Release Bump        | Changelog            | Description              |
| :--------- | :------------------ | :------------------- | :----------------------- |
| `feat`     | **Minor** (`x.X.0`) | Added to Features    | New functionality        |
| `fix`      | **Patch** (`x.x.X`) | Added to Bug Fixes   | Bug fix                  |
| `perf`     | **Patch** (`x.x.X`) | Added to Performance | Performance optimization |
| `refactor` | None                | Added to Maintenance | Internal refactoring     |
| `docs`     | None                | Added to Maintenance | Documentation only       |
| `test`     | None                | Added to Maintenance | Adding/modifying tests   |
| `chore`    | None                | Added to Maintenance | Tooling, dependencies    |
| `ci`       | None                | Added to Maintenance | CI/CD configurations     |

> 💥 **Breaking Changes**: Any commit containing `BREAKING CHANGE:` in the footer triggers a **Major** release (`X.0.0`).

### Allowed Scopes:

`auth`, `feed`, `chat`, `profile`, `user`, `post`, `follow`, `media`, `ws`, `infra`, `deps`, `security`, `backend`, `frontend`.

---

## 🏗️ 3. Core Architecture Invariants

### 🟦 Backend (NestJS 11 + Fastify)

- **Strict 4-Tier Layering**: `Controller -> Service -> Repository -> PrismaService`.
- Controllers and services **MUST NEVER** invoke `PrismaService` directly.
- **Validation**: Enforced strictly via **Zod contracts** (`@common/contracts`) and `ZodValidationPipe`. Zero `class-validator` runtime reflection.
- **Testing**: Backend tests are strictly End-to-End (`backend/test/` using Jest & Supertest). Do not introduce unit tests (`*.spec.ts`) in `backend/src/`.

### 🟩 Frontend (React 19 + Vite 8 + FSD)

- **Feature-Sliced Design (FSD)**: `app -> pages -> widgets -> features -> entities -> shared`.
- Imports are strictly unidirectional: import only from lower layers.
- Every slice must export strictly via its root `index.ts` (Public API). Deep internal imports are forbidden.
- **State Partitioning**: Server state via **TanStack Query**; local UI state via **Zustand**.
- All data components must explicitly handle `isLoading`, `isError`, and empty states.

---

## 🐳 4. Local Infrastructure (Docker)

Before running development servers or E2E tests, boot local dependencies (PostgreSQL 16, Redis 7, MinIO):

```bash
# Start local containers in background
pnpm docker:dev:up

# Stream real-time logs from containers
pnpm docker:dev:logs

# Stop local development containers
pnpm docker:dev:down

# Reset containers and purge local data volumes
pnpm docker:clean
```

---

## 🧪 5. Local Verification Commands

Before opening a pull request, run the verification suite:

```bash
# 1. Typecheck the entire monorepo
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Code formatting
pnpm format:check

# 4. Monorepo validation (EOL, env, actions, knip)
pnpm validate

# 5. Full test suite
pnpm test
```

---

## 🔀 6. Pull Request Guidelines

1. **Keep PRs Focused**: Aim for cohesive, reviewable pull requests.
2. **PR Title**: Must follow Conventional Commits format (e.g. `feat(feed): implement story poll voting`).
3. **Automated CI**: Every PR runs the full GitHub Actions matrix (`validate-eol`, `format-check`, `setup`, `backend-lint`, `frontend-lint`, `backend-test`, `backend-e2e`, `frontend-prod-assessment`, `docker-build`).
4. **Merge Strategy**: We use **Squash and Merge**. Upon merging into `main` or `develop`, **Semantic Release** automatically tags releases and updates `CHANGELOG.md`.

---

## 💡 Need Help?

- Check our [Documentation Portal](./docs/README.md).
- Open an issue or join our community discussions on GitHub!

Thank you for helping make Social Network better for everyone! 🎉
