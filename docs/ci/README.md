# CI/CD Pipeline Documentation

## Overview

The CI/CD pipeline uses GitHub Actions with a staged architecture for fast feedback and clear failure isolation.

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PR / Push to main/develop                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                   ▼
              ┌──────────┐     ┌─────────────┐     ┌─────────────┐
              │ changes  │     │ validate-eol│     │ format-check│
              │ (filter) │     │   (5 min)   │     │  (10 min)   │
              └──────────┘     └─────────────┘     └─────────────┘
                    │                                       │
                    └──────────────────┬──────────────────┘
                                       ▼
                              ┌───────────────┐
                              │     setup     │
                              │ (install deps)│
                              │   (15 min)    │
                              └───────────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           ▼                           ▼                           ▼
    ┌─────────────┐           ┌─────────────┐             ┌─────────────┐
    │backend-lint │           │frontend-lint│             │ docker-build│
    │  (15 min)   │           │  (15 min)   │             │  (30 min)   │
    └─────────────┘           └─────────────┘             └─────────────┘
           │                           │
           ▼                           │
    ┌─────────────┐                    │
    │backend-test │                    │
    │(3 shards)   │                    │
    │  (10 min)   │                    │
    └─────────────┘                    │
           │                           │
           ▼                           ▼
    ┌─────────────┐           ┌─────────────────────┐
    │ backend-e2e │           │frontend-prod-assess │
    │  (20 min)   │           │    (25 min)         │
    └─────────────┘           └─────────────────────┘
           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       ▼
                              ┌───────────────┐
                              │  ci-success   │
                              │   (gate)      │
                              └───────────────┘
```

## Jobs Reference

### changes

- **Purpose**: Detect which parts of the codebase changed
- **Tool**: `dorny/paths-filter@v3`
- **Outputs**: `backend`, `frontend`, `docker`, `ci` booleans
- **Timeout**: 5 min

### validate-eol

- **Purpose**: Check all tracked files for CRLF line endings
- **Script**: `scripts/validate-eol.js`
- **Timeout**: 5 min

### format-check

- **Purpose**: Verify code formatting with Prettier
- **Command**: `prettier --check . --ignore-unknown`
- **Timeout**: 10 min

### setup

- **Purpose**: Install dependencies and generate cache key
- **Cache**: `node_modules` + `backend/node_modules` + `frontend/node_modules` + `~/.cache/prisma`
- **Key**: `{runner.os}-monorepo-pnpm-{hash(pnpm-lock.yaml, schema.prisma)}`
- **Timeout**: 15 min

### backend-lint / frontend-lint

- **Purpose**: ESLint + TypeScript type checking
- **Cache**: `.eslintcache` (per workspace)
- **Timeouts**: 15 min each

### backend-test

- **Purpose**: Unit tests with coverage
- **Strategy**: 3-way Jest shard matrix
- **Timeout**: 10 min per shard

### backend-e2e

- **Purpose**: End-to-end API tests
- **Services**: PostgreSQL 16 + Redis 7
- **Timeout**: 20 min

### frontend-prod-assessment

- **Purpose**: Lighthouse CI + bundle size check
- **Runs**: 3 Lighthouse runs (median score)
- **Tools**: `treosh/lighthouse-ci-action`, `preactjs/compressed-size-action`
- **Timeout**: 25 min

### docker-build

- **Purpose**: Build + scan Docker images
- **Strategy**: Matrix (backend, frontend)
- **Tools**: Docker Buildx + Trivy SARIF
- **Timeout**: 30 min

### coverage-report

- **Purpose**: Post coverage comment to PR
- **Tool**: `davelosert/vitest-coverage-report-action`
- **Timeout**: 5 min

### ci-success

- **Purpose**: Aggregate gate — fails if any required job failed
- **Logic**: Python heredoc evaluating `toJSON(needs)`
- **Timeout**: 5 min

## Concurrency

All workflows use concurrency groups to cancel outdated runs:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Permissions

All workflows follow the principle of least privilege:

- Default: `permissions: read-all`
- Individual jobs declare only what they need (e.g., `security-events: write` for Trivy, `pull-requests: write` for comments)

## Timeouts

Every job has an explicit `timeout-minutes` to prevent hung jobs from consuming CI resources:

| Job                      | Timeout |
| ------------------------ | ------- |
| changes                  | 5       |
| validate-eol             | 5       |
| commitlint               | 10      |
| setup                    | 15      |
| format-check             | 10      |
| backend-lint             | 15      |
| frontend-lint            | 15      |
| backend-test             | 10      |
| backend-e2e              | 20      |
| frontend-test            | 10      |
| frontend-prod-assessment | 25      |
| docker-build             | 30      |
| coverage-report          | 5       |
| ci-success               | 5       |

## Security

- Third-party actions pinned to major versions (SHA pinning recommended for higher security)
- `permissions: read-all` as baseline
- Trivy scans images for CRITICAL/HIGH vulnerabilities
- CodeQL analyzes JavaScript/TypeScript + GitHub Actions code
- Gitleaks scans for secrets in git history
- npm audit checks for vulnerable dependencies
