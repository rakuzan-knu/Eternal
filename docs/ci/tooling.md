# 🛠️ Developer Tooling, Quality Gates & Local Parity

To ensure seamless onboarding for open-source contributors and zero disparity between local development and production environments, the monorepo incorporates unified tooling, automated quality gates, and cross-platform consistency mechanisms.

---

## 🎯 Architecture Principles

1. **Local-to-Production Parity**: Dev and prod Docker environments share network models, resource limits, and healthcheck semantics.
2. **Deterministic Cross-Platform Behavior**: Strict line endings (LF) and standardized node engine versions are validated automatically before commits and during CI.
3. **Automated Quality Gates**: Static analysis, type checking, bundle size tracking, and Web Vitals assertions block regressions at the pull request boundary.

---

## 🐳 Docker Compose Environment Parity

The repository maintains two coordinated Compose configurations:

- `docker-compose.dev.yml`: Optimized for rapid iteration, hot reloading, and exposed debug ports.
- `docker-compose.prod.yml`: Hardened, non-root multi-stage production deployment.

### Shared Parity Invariants

| Feature              | Development (`docker-compose.dev.yml`)                            | Production (`docker-compose.prod.yml`)                            |
| :------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------------- |
| **Network Topology** | `internal` (bridge, backend isolation) + `public`                 | `internal` (bridge, backend isolation) + `public`                 |
| **Logging Driver**   | `json-file` with rotation (`max-size: 10m`, `max-file: 3`)        | `json-file` with rotation (`max-size: 10m`, `max-file: 3`)        |
| **Healthchecks**     | `interval: 10s`, `timeout: 5s`, `retries: 5`, `start_period: 10s` | `interval: 10s`, `timeout: 5s`, `retries: 5`, `start_period: 10s` |
| **Resource Limits**  | postgres: 1 CPU / 512MB, redis: 0.5 CPU / 256MB                   | Defined per deployment profile                                    |
| **Volumes**          | Named local volumes with `driver: local`                          | Named local volumes / cloud storage                               |

---

## ⚡ Monorepo Convenience Scripts

Root `package.json` provides convenience commands wrapping complex workspace and container tasks:

### Development & Containers

```bash
# Start background development containers (PostgreSQL, Redis, MinIO)
pnpm docker:dev:up

# Stop development containers
pnpm docker:dev:down

# Stream real-time container logs
pnpm docker:dev:logs

# Rebuild dev container images
pnpm docker:dev:build

# Tear down all Docker containers, networks, and persistent volumes
pnpm docker:clean

# System and volume cleanup
pnpm docker:prune
```

### Validation & Quality Gates

```bash
# Run all static validation checks in one pass
pnpm validate

# Check and fix cross-platform line endings (LF enforcement)
pnpm validate:eol
pnpm fix:eol

# Verify environment variables against .env.example templates
pnpm validate:env

# Verify third-party GitHub Actions are securely pinned
pnpm validate:actions

# Check Prettier formatting across the entire monorepo
pnpm format:check

# Find unused dependencies, exports, and types with Knip
pnpm knip
```

### Cleanup Utility (`scripts/utils/clean.js`)

```bash
# Remove node_modules, build outputs (dist), coverage, and cache
pnpm clean

# Dry-run preview of files that would be deleted
node scripts/utils/clean.js --dry-run

# Clean project artifacts and prune Docker storage simultaneously
pnpm clean:prune
```

---

## 📏 Cross-Platform Line-Ending Policy

Inconsistent line endings (`CRLF` vs `LF`) cause noisy diffs and break bash scripts inside Docker Alpine containers. The project enforces **strict LF line endings**:

1. **Git Configuration (`.gitattributes`)**:
   - Declares `* text=auto eol=lf` as the monorepo baseline.
   - Explicit text declarations for `.ts`, `.tsx`, `.js`, `.json`, `.md`, `.yml`, and `.sql`.
   - Comprehensive binary patterns for fonts, archives, media files, and lockfiles to suppress noisy diffs.
2. **Local Pre-Commit Hook (`.husky/pre-commit`)**:
   - Executes `scripts/ci/validate-eol.js` prior to `lint-staged`.
   - Blocks commits immediately if CRLF characters are introduced.
3. **CI Pipeline Gate**:
   - Dedicated `validate-eol` job executes in parallel on every pull request.

---

## 🚦 Lighthouse CI Performance Quality Gates

Frontend builds are automatically benchmarked using **Lighthouse CI** (`.lighthouserc.json`) on pull requests touching `frontend/`:

| Metric Category                    | Quality Threshold | Enforcement Level        |
| :--------------------------------- | :---------------- | :----------------------- |
| **Performance**                    | `≥ 0.85`          | **Error** (blocks merge) |
| **Accessibility**                  | `≥ 0.95`          | **Error** (blocks merge) |
| **Best Practices**                 | `≥ 0.90`          | **Error** (blocks merge) |
| **SEO**                            | `≥ 0.85`          | **Error** (blocks merge) |
| **Errors in Console**              | `0`               | **Error** (blocks merge) |
| **First Contentful Paint (FCP)**   | `≤ 1800ms`        | Warning                  |
| **Largest Contentful Paint (LCP)** | `≤ 2500ms`        | Warning                  |
| **Total Blocking Time (TBT)**      | `≤ 200ms`         | Warning                  |
| **Cumulative Layout Shift (CLS)**  | `≤ 0.1`           | Warning                  |

To run Lighthouse audits locally:

```bash
# Build frontend and trigger Lighthouse CI runner
pnpm --filter frontend build
pnpm lhci
```
