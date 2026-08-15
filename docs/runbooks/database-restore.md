# Runbook: Database Restore & Disaster Recovery

## 1. Scope & Objective

Restore PostgreSQL database from automated backups created by `scripts/backup-db.sh` or perform point-in-time recovery (PITR) with minimal downtime.

---

## 2. Backup Verification

Backups are compressed and stored locally or on remote object storage (`s3://backups/postgres`):

```bash
# Verify backup archive integrity
tar -tvf /backups/postgres/db_backup_latest.tar.gz
gzip -t /backups/postgres/db_backup_latest.tar.gz
```

---

## 3. Database Restore Procedure

### Step 1: Put Application into Maintenance Mode

```bash
# Scale backend to 0 or route traffic to maintenance page
docker-compose -f docker-compose.prod.yml stop backend
```

### Step 2: Terminate Active Connections

```bash
docker exec -it postgres psql -U user -d postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'social' AND pid <> pg_backend_pid();"
```

### Step 3: Restore Database from Dump

```bash
# Drop and recreate target database
docker exec -it postgres psql -U user -d postgres -c "DROP DATABASE IF EXISTS social;"
docker exec -it postgres psql -U user -d postgres -c "CREATE DATABASE social OWNER user;"

# Restore from backup file
gunzip -c /backups/postgres/social_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i postgres psql -U user -d social
```

### Step 4: Validate Schema & Run Pending Migrations

```bash
cd backend
npx prisma migrate status
npx prisma migrate deploy
```

### Step 5: Resume Application Services

```bash
docker-compose -f docker-compose.prod.yml start backend
curl -I http://localhost:3000/health
```

---

## 4. Rollback of Erroneous Prisma Migration

If a bad migration failed or corrupted schema:

```bash
# Mark migration as rolled back in Prisma migration history table
npx prisma migrate resolve --rolled-back "20260815_faulty_migration"

# Re-apply previous valid migration state
npx prisma migrate deploy
```
