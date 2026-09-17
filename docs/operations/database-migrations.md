# 🗄️ Database Migration Strategy: Expand / Contract Pattern

This guide explains our zero-downtime database migration architecture using **Prisma ORM** and PostgreSQL.

---

## 🛑 Problem Statement

Synchronous database migrations during container boots can trigger downtime or lock tables if a migration introduces breaking DDL statements (e.g. dropping columns, renaming tables, or adding `NOT NULL` columns without default values) while previous application instances are actively processing traffic.

To achieve continuous deployment without downtime, all database schema updates adhere to the **Expand / Contract (Parallel Run)** pattern.

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

- Add new columns or tables as **nullable** or with a sensible **`DEFAULT`**.
- **Rule**: Never remove or rename an existing table/column in Phase 1.
- **Rule**: Never add a `NOT NULL` constraint without a `DEFAULT` value.
- Existing application code continues running undisturbed.

### Phase 2: Dual-Write & Data Migration

- Deploy application code that writes to both representations or reads with fallbacks.
- Run background asynchronous backfill jobs for historical records.

### Phase 3: Contract (Cleanup)

- Once 100% of production traffic is served by the new code version, deploy a cleanup migration to drop the obsolete fields.

---

## 🛡️ Static Migration Linting (`scripts/db/validate-prisma-migrations.cjs`)

In our CI/CD pipeline, every pull request containing migration files is statically scanned for illegal destructive patterns:

```bash
node scripts/db/validate-prisma-migrations.cjs
```

### Prohibited Patterns:

1. `DROP COLUMN` -> Use Expand/Contract lifecycle instead.
2. `RENAME COLUMN` -> Add new column, replicate data, then drop old column.
3. `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` without `DEFAULT`.
4. `DROP TABLE` without prior deprecation period.
