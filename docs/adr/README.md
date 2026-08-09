# Architecture Decision Records

This document records significant architectural decisions made for this project.

---

## ADR-001: Monorepo with npm Workspaces

**Status**: Accepted

**Date**: 2026-06

### Context

We needed a way to manage both backend and frontend codebases in a single repository while maintaining clear separation of concerns.

### Decision

Use **npm workspaces** with two packages (`backend`, `frontend`) and a single root `package-lock.json`.

### Consequences

- **Positive**: Single dependency install, shared tooling, atomic commits across stack
- **Negative**: Requires careful CI caching strategy, nested lockfiles must be avoided
- **Rejected alternatives**: Turborepo (overkill for 2 packages), Yarn (team familiarity with npm)

---

## ADR-002: NestJS for Backend Framework

**Status**: Accepted

**Date**: 2026-06

### Context

Need a scalable, maintainable backend framework with strong TypeScript support and modular architecture.

### Decision

Use **NestJS** with its module-based architecture, dependency injection, and built-in support for WebSockets, Swagger, and microservices patterns.

### Consequences

- **Positive**: Modular architecture, decorators reduce boilerplate, excellent TypeScript support
- **Negative**: Steeper learning curve, heavier than Express/Fastify
- **Rejected alternatives**: Express.js (too minimal), Fastify (less ecosystem), Koa

---

## ADR-003: Prisma as ORM

**Status**: Accepted

**Date**: 2026-06

### Context

Need type-safe database access with migration support and good PostgreSQL integration.

### Decision

Use **Prisma 5** as the ORM with PostgreSQL as the primary database.

### Consequences

- **Positive**: Type-safe queries, auto-generated types, migration system, Prisma Studio
- **Negative**: Query performance limitations for complex queries, vendor lock-in
- **Rejected alternatives**: TypeORM (less type-safe), Drizzle (newer, less mature), raw SQL (no type safety)

---

## ADR-004: React + Vite for Frontend

**Status**: Accepted

**Date**: 2026-06

### Context

Need a modern frontend framework with fast development experience and good TypeScript support.

### Decision

Use **React 19** with **Vite 8** (Rolldown-based build), **TypeScript 6**, and **Tailwind CSS 4**.

### Consequences

- **Positive**: Fast HMR, React Compiler optimization, Tailwind v4 performance
- **Negative**: Vite 8 is bleeding-edge, potential plugin compatibility issues
- **Rejected alternatives**: Next.js (overkill for SPA), Remix, SvelteKit

---

## ADR-005: JWT Authentication with Refresh Tokens

**Status**: Accepted

**Date**: 2026-06

### Context

Need stateless authentication that works across web and potential mobile clients.

### Decision

Use **JWT** with short-lived access tokens (15 min) and long-lived refresh tokens (7 days), stored as httpOnly cookies. Passwords hashed with **argon2**.

### Consequences

- **Positive**: Stateless, scalable, works across domains
- **Negative**: Token revocation requires additional infrastructure (blocklist)
- **Rejected alternatives**: Session-based auth (stateful), OAuth-only (complexity)

---

## ADR-006: Docker Compose Parity (Dev/Prod)

**Status**: Accepted

**Date**: 2026-08

### Context

Development and production Docker configurations had diverged, causing "works on my machine" issues.

### Decision

Align `docker-compose.dev.yml` with `docker-compose.prod.yml` patterns:

- Both use `internal` + `public` networks
- Both use json-file logging with rotation
- Both define resource limits (deploy.resources)
- Both use healthcheck `start_period`
- Dev keeps hardcoded credentials; prod uses env vars

### Consequences

- **Positive**: Consistent networking, logging, and resource management
- **Negative**: Slightly heavier dev containers

---

## ADR-007: Conventional Commits + Semantic Release

**Status**: Accepted

**Date**: 2026-06

### Context

Need automated versioning and changelog generation based on commit history.

### Decision

Use **Conventional Commits** specification enforced by **commitlint** (local) and **action-semantic-pull-request** (CI). Releases automated via **semantic-release** with `@semantic-release/changelog` and `@semantic-release/git`.

### Branch strategy:

- `main` → stable releases
- `develop` → beta prereleases

### Consequences

- **Positive**: Automated versioning, structured changelog, clear commit history
- **Negative**: Requires discipline in commit message format

---

## ADR-008: CI Pipeline Design

**Status**: Accepted

**Date**: 2026-08

### Context

Need a fast, reliable CI pipeline that catches issues before merge without being overly slow.

### Decision

Use a **staged pipeline** with `dorny/paths-filter` for change detection:

1. **changes** — detect which parts changed
2. **validate-eol** + **format-check** — fast static checks (parallel)
3. **setup** — install deps + generate cache key
4. **backend-lint** + **frontend-lint** + **backend-test** (3 shards) — parallel
5. **backend-e2e** — after backend setup complete
6. **frontend-prod-assessment** — Lighthouse + bundle size
7. **docker-build** — Buildx + Trivy scan

All jobs have explicit `timeouts` and `concurrency` groups. All use `permissions: read-all` as default.

### Consequences

- **Positive**: Fast feedback (~5-10 min for typical PR), clear failure isolation
- **Negative**: Complex workflow file, requires maintenance

---

## ADR-009: Line Ending Policy (LF Everywhere)

**Status**: Accepted

**Date**: 2026-08

### Context

Cross-platform development (Windows + macOS + Linux) caused CRLF/LF inconsistencies.

### Decision

Enforce **LF everywhere** via:

1. `.editorconfig` — `end_of_line = lf`
2. `.gitattributes` — `* text=auto eol=lf` + explicit binary declarations
3. `scripts/validate-eol.js` — cross-platform validator using `git ls-files`
4. `.husky/pre-commit` — runs validator before commit
5. CI `validate-eol` job — blocks merge on violations

### Consequences

- **Positive**: Consistent diffs, no line-ending-only commits, works cross-platform
- **Negative**: Requires `git add --renormalize .` one-time migration for existing files

---

## ADR-010: Lighthouse CI Assertions

**Status**: Accepted

**Date**: 2026-08

### Context

Need automated performance/quality gates for frontend changes without blocking development on minor regressions.

### Decision

Use **lighthouse:recommended** preset with custom assertions:

| Category          | Level | Threshold |
| ----------------- | ----- | --------- |
| performance       | error | ≥0.85     |
| accessibility     | error | ≥0.95     |
| best-practices    | error | ≥0.90     |
| seo               | error | ≥0.85     |
| errors-in-console | error | —         |
| FCP               | warn  | ≤1800ms   |
| LCP               | warn  | ≤2500ms   |
| TBT               | warn  | ≤200ms    |
| CLS               | warn  | ≤0.1      |

Runs 3 times (median score) on `pull_request` with frontend changes.

### Consequences

- **Positive**: Catches real regressions, allows minor fluctuations
- **Negative**: Requires tuning thresholds as app grows

---

## ADR-011: Dependency Update Strategy

**Status**: Accepted

**Date**: 2026-08

### Context

Need automated dependency updates without overwhelming the team or introducing breaking changes.

### Decision

Use **Dependabot** with:

- Root-only npm updates (single lockfile model)
- Weekly schedule, 10 PR limit
- Major version updates ignored (manual review required)
- Grouped production + dev dependencies
- Docker ecosystem monitoring
- GitHub Actions updates (monthly)

### Consequences

- **Positive**: Automated, batched updates, clear review process
- **Negative**: Requires initial PR volume when enabling
