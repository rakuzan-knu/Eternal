# ADR 002: Zero `packages/` Directory Architecture and Direct Path Aliases

## Status

Accepted

## Context

Standard monorepo patterns often extract shared code into a separate `packages/` or `libs/` folder. For this project, extracting backend modules or frontend FSD layers into synthetic shared packages would introduce unnecessary build steps, versioning friction, symlink overhead, and complex tsconfig project references without functional benefit.

## Decision

1. Maintain strict architectural constraints: **No `packages/` directory**.
2. Keep all backend contracts and domain logic strictly inside `backend/src/`.
3. Keep all frontend FSD layers strictly inside `frontend/src/`.
4. Configure TypeScript path aliases and Vite bundler aliases:
   - `@backend/*` -> `backend/src/*` (in frontend vite/tsconfig for direct type sharing).
   - `@common/contracts` -> `backend/src/common/contracts/index.ts`.
   - `@common/prisma` -> `backend/src/common/prisma/index.ts`.
   - `@/*` -> `frontend/src/*`.

## Consequences

### Positive

- **High Developer Velocity**: Zero build step required to reflect contract changes across apps during development.
- **Simplicity**: No package version bumping, no local package publish step, no symlink resolution bugs.
- **Full Type-Safety**: Frontend consumes exact backend contract types at compile time.

### Negative / Trade-offs

- Frontend must not import backend runtime modules that rely on Node.js-only dependencies. Only pure types and contracts from `@backend/common/contracts` are permitted.
