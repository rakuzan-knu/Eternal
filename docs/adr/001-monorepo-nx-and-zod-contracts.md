# ADR 001: Monorepo Hardening with Nx & Single-Source-of-Truth Zod Contracts

## Status

Accepted

## Context

The codebase previously used class-validator and class-transformer decorators for backend DTO validation. This introduced runtime reflection overhead, boilerplate class declarations, metadata generation requirements (`emitDecoratorMetadata`), and duplicate interface declarations on the frontend. Furthermore, workspace task coordination lacked unified dependency tracking and caching.

## Decision

1. Adopt **Nx** (`@nx/js`, `@nx/nest`, `@nx/react`, `@nx/vite`, `@nx/eslint`, `@nx/workspace`) to manage workspace task graphs, affected task execution, and caching across `backend` and `frontend`.
2. Migrate all backend DTOs to **Zod contracts** placed in `backend/src/common/contracts/`.
3. Introduce a custom `ZodValidationPipe` to validate and transform request payloads using Zod schemas.
4. Remove `class-validator` and `class-transformer` completely from the backend runtime.
5. Export both runtime Zod schemas and inferred static TypeScript types (`z.infer<typeof schema>`) from `@common/contracts`.

## Consequences

### Positive

- **Single Source of Truth**: Backend validation and frontend client typing share identical contract definitions.
- **Improved Performance**: Elimination of decorator metadata reflection at runtime.
- **Type Safety**: Zod guarantees runtime validation matches strict TypeScript compiler types without drift.
- **Zero Package Overhead**: Contracts reside directly in `backend/src/common/contracts/` without requiring external package builds.

### Negative / Trade-offs

- Custom Swagger schema integration requires lightweight class definitions for endpoints utilizing `@ApiResponse({ type: DtoClass })`.
