# 🗄️ Database Migration Strategy: Expand / Contract Pattern

This document describes the zero-downtime database migration strategy for the platform using **Prisma** and PostgreSQL.

---

## 🛑 Problem Statement

Running `npx prisma migrate deploy` synchronously during container boot can block deployments or cause downtime if a migration contains breaking DDL operations (e.g. dropping columns, renaming tables, or adding `NOT NULL` columns without default values) while previous application instances are still processing live traffic.

To achieve continuous deployment with zero downtime, all database schema updates must follow the **Expand / Contract (Parallel Run)** design pattern and be backwards-compatible with active application instances.

---

## 🔄 The 3-Phase Expand / Contract Lifecycle

```
    Phase 1: EXPAND              Phase 2: DUAL-WRITE / MIGRATE           Phase 3: CONTRACT
+-----------------------+        +---------------------------+        +-----------------------+
|  Add new DB columns   |  --->  |  App reads/writes both    |  --->  | Remove old columns    |
|  (Nullable / Defaults)|        |  Backfill background data |        |  & cleanup legacy DB  |
+-----------------------+        +---------------------------+        +-----------------------+
```

### Phase 1: Expand (Non-Breaking Additions)

- Add new tables, columns, or indexes as **nullable** or with a **`DEFAULT` value**.
- **Rule**: Never remove or rename an existing table/column in Phase 1.
- **Rule**: Never add a `NOT NULL` constraint without a `DEFAULT` value.
- Application code continues using old schema fields or starts accepting optional new fields.

### Phase 2: Transition & Dual-Write (Feature Flag Gated)

- Deploy application code that handles both old and new schema representation.
- Gate feature transitions behind environment variables / feature flags (e.g. `ENABLE_NEW_SCHEMA_V2=true`).
- Run background backfill scripts if historical data needs to be populated into new fields.

### Phase 3: Contract (Deprecation & Cleanup)

- Once 100% of traffic is served by code using the new schema, deploy a final cleanup migration.
- Remove old deprecated columns/tables safely without interrupting service.

---

## 🛡️ Static Migration Linting (`scripts/validate-prisma-migrations.js`)

Before any migration is applied in CI/CD, all migration `.sql` files are scanned for illegal breaking DDL patterns:

```bash
node scripts/validate-prisma-migrations.js
```

### Prohibited Operations in Migration SQL:

1. `DROP COLUMN` -> Use Expand/Contract instead.
2. `RENAME COLUMN` -> Add new column, copy data, then drop old column later.
3. `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` without `DEFAULT`.
4. `DROP TABLE` -> Verify table is completely unused by active apps first.

---

## 🚀 Safe Migration Deployment (`scripts/safe-migrate-deploy.sh`)

Deployments execute migrations via `scripts/safe-migrate-deploy.sh` which enforces:

1. Static analysis of schema changes.
2. Statement timeout limit (`SET statement_timeout = '5s'`) to prevent table lock escalation.
3. Transactional schema execution with safe error reporting.

```bash
# Execute safe migration in container startup / deployment pipeline
bash scripts/safe-migrate-deploy.sh
```
