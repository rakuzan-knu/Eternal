# SOC-45: Developer Experience, Docker & Tooling Parity

## Summary

This change set improves developer experience through Docker configuration parity, root npm scripts, cross-platform line-ending validation, CI optimization, and Lighthouse CI assertion updates.

## Changes

### 1. Docker Compose Parity

**File**: `docker-compose.dev.yml`

Added production-aligned patterns to dev configuration:

- `internal` (internal: true) + `public` bridge networks
- JSON-file logging with rotation (`max-size: 10m`, `max-file: 3`) via YAML anchor
- `start_period: 10s` on all healthchecks
- `deploy.resources` limits (postgres: 1 CPU/512M, redis: 0.5 CPU/256M, minio: 0.5 CPU/256M)
- `driver: local` on named volumes
- Network assignments on `minio-init` service

### 2. Root npm Scripts

**File**: `package.json`

Added convenience scripts:

| Script              | Description                               |
| ------------------- | ----------------------------------------- |
| `docker:dev:up`     | Start dev Docker services                 |
| `docker:dev:down`   | Stop dev Docker services                  |
| `docker:dev:logs`   | Follow dev service logs                   |
| `docker:dev:build`  | Rebuild dev services                      |
| `docker:prod:up`    | Start production stack                    |
| `docker:prod:down`  | Stop production stack                     |
| `docker:prod:logs`  | Follow production logs                    |
| `docker:prod:build` | Rebuild production stack                  |
| `docker:clean`      | Tear down all compose stacks with volumes |
| `docker:prune`      | Docker system + volume prune              |
| `lhci`              | Run Lighthouse CI locally                 |
| `validate:eol`      | Check line endings                        |
| `validate:env`      | Validate environment variables            |
| `clean`             | Clean build artifacts                     |
| `format:check`      | Check Prettier formatting                 |
| `validate`          | Run all validators                        |

### 3. Line-Ending Validator

**File**: `scripts/validate-eol.js` (new)

Cross-platform validator that:

- Uses `git ls-files` for tracked-file accuracy (falls back to FS walk)
- Detects CRLF (`\r\n`) in text files only
- Ignores binary files, lockfiles, and common non-source directories
- Outputs clear violation report with fix instructions
- Exits non-zero on violations

**Enforcement**:

- `.husky/pre-commit` — runs before lint-staged
- CI `validate-eol` job — blocks merge on violations

### 4. Git Attributes

**File**: `.gitattributes`

Expanded from 9 to 116 lines with:

- Explicit text declarations for all source file types
- Comprehensive binary patterns (fonts, archives, media, documents, native modules, databases)
- Lock files marked binary to suppress noisy diffs

### 5. Lighthouse CI Assertions

**File**: `.lighthouserc.json`

Upgraded from all-`warn` (never fails) to meaningful quality gates:

| Category          | Level | Threshold |
| ----------------- | ----- | --------- |
| performance       | error | ≥0.85     |
| accessibility     | error | ≥0.95     |
| best-practices    | error | ≥0.90     |
| seo               | error | ≥0.85     |
| errors-in-console | error | —         |
| meta-description  | error | —         |
| FCP               | warn  | ≤1800ms   |
| LCP               | warn  | ≤2500ms   |
| TBT               | warn  | ≤200ms    |
| CLS               | warn  | ≤0.1      |
| speed-index       | warn  | ≤2000ms   |

Changed preset from `lighthouse:recommended` to `lighthouse:no-pwa`.

### 6. CI Workflow Improvements

**File**: `.github/workflows/ci.yml`

- Added `validate-eol` job (runs on every push/PR)
- Added `format-check` job (Prettier validation)
- Added `timeout-minutes` to all 14 jobs
- Reduced `backend-e2e` serialization: `needs: [setup, backend-lint, backend-test]` → `[changes, setup]`
- Reduced `frontend-prod-assessment` needs: dropped `frontend-test`
- Added `if:` guard to `backend-e2e`

### 7. Additional Fixes

| File                                         | Change                                              |
| -------------------------------------------- | --------------------------------------------------- |
| `storybook.yml`                              | Fixed skip guard (job-level `if:` with `hashFiles`) |
| `pr-title.yml`                               | Synced types/scopes with commitlint                 |
| `release.yml`                                | Fixed plugin name; added `develop` trigger          |
| `backend/package.json`                       | Fixed coverage directory path                       |
| `.husky/pre-push`                            | Rewritten as clean UTF-8                            |
| `.nvmrc`                                     | Pinned to `22.12.0`                                 |
| `package.json`                               | Added `@lhci/cli`, `prettier` to devDependencies    |
| `.github/dependabot.yml`                     | Root-only + docker + github-actions ecosystems      |
| `.github/labeler.yml`                        | Path-based auto-labeling config                     |
| `.github/workflows/labeler.yml`              | Labeler workflow                                    |
| `.github/workflows/sync-labels.yml`          | Label sync workflow                                 |
| `.github/labels.yml`                         | Label definitions (11 labels)                       |
| `.github/CODEOWNERS`                         | Default `*` owner + full coverage                   |
| `.github/workflows/codeql.yml`               | Added `actions` language + config + timeout         |
| `.github/codeql/codeql-config.yml`           | CodeQL paths-ignore config                          |
| `.github/workflows/security.yml`             | Timeouts for all jobs                               |
| `.github/workflows/labeler.yml`              | Concurrency + timeout                               |
| `.github/workflows/pr-title.yml`             | Concurrency + timeout                               |
| `.github/workflows/release.yml`              | Timeouts + artifact reuse                           |
| `.github/workflows/storybook.yml`            | Timeout                                             |
| `.github/workflows/vercel-preview.yml`       | Script injection fix + timeout                      |
| `frontend/vite.config.ts`                    | `build.sourcemap: 'hidden'`                         |
| `scripts/check-env.js`                       | Optional keys support + typo fix                    |
| `scripts/clean.js`                           | New: monorepo cleanup utility                       |
| `scripts/postinstall.js`                     | Encoding fix                                        |
| `.prettierignore`                            | Extended coverage                                   |
| `.github/actions/setup-node-deps/action.yml` | New: composite CI action                            |

### 8. New Utility Scripts

**File**: `scripts/clean.js` (new)

Monorepo cleanup utility:

- Removes `node_modules`, `dist`, `coverage`, `.cache` directories
- Reports space freed
- `--dry-run` mode for preview
- `--prune` mode for Docker system prune

**File**: `scripts/check-env.js` (improved)

Environment variable validator:

- Reads `.env.example` to determine required keys
- Checks `.env` for presence and non-empty values
- Supports `# optional` annotation for optional keys
- Reports specific missing/empty keys

## Migration Notes

### For Developers

1. **Line endings**: If you have existing CRLF files, run:

   ```bash
   git add --renormalize .
   ```

2. **Docker**: Dev containers now have resource limits. Adjust in `docker-compose.dev.yml` if needed.

3. **Formatting**: `format:check` now covers the entire repository. Run `pnpm format` to auto-fix.

4. **Node version**: `.nvmrc` is now `22.12.0`. Update your local Node if needed.

### For CI/CD

No breaking changes. The pipeline is backward-compatible with existing branch protection rules.
