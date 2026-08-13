# 📖 Operational Runbooks

Standard Operating Procedures (SOPs) for incident management, disaster recovery, secret rotation, and rollbacks.

---

## 1. 🗄️ Database Failover & High Availability Recovery

### Primary Database Outage Scenario

When PostgreSQL primary becomes unreachable or fails health checks:

1. **Verify Database Health**:
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}
   ```
2. **Promote Standby / Read-Replica**:
   - If using Managed Postgres (AWS RDS / TiDB Cloud / Neon): Trigger automatic failover or promote replica via cloud provider CLI/console.
   - Update `DATABASE_URL` in environment secrets.
3. **Restart Backend Services**:
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```
4. **Verify Application Health**:
   ```bash
   curl -i http://localhost:3000/health
   ```

---

## 2. 💾 Backup Restore Drill & Manual Recovery

### Restoring from Backup Dump

1. **Locate Latest Backup File**:
   ```bash
   ls -la /backups/backup_*.sql.gz
   ```
2. **Execute Automated Restore Drill Script**:
   ```bash
   bash scripts/verify-backup.sh /backups/backup_social_20260813_000000.sql.gz
   ```
3. **Manual Production Restore (Emergency)**:
   ```bash
   # Stop application traffic
   docker compose -f docker-compose.prod.yml stop backend

   # Restore database from compressed dump
   gunzip -c /backups/backup_social_TARGET.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}

   # Restart backend
   docker compose -f docker-compose.prod.yml start backend
   ```

---

## 3. 🔐 Secret & Credential Rotation Runbook

### Rotating JWT Secret Keys

1. **Generate New Secret Keys**:
   ```bash
   openssl rand -base64 32
   ```
2. **Update Environment**:
   - Update `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in GitHub Secrets / Render Dashboard / `.env`.
3. **Rolling Restart Backend**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --no-deps --scale backend=2 backend
   ```
4. **Invalidate Active User Sessions**:
   Users will be prompted to re-authenticate as refresh tokens signed with old keys expire.

---

## 4. 🚨 Emergency Production Incident Rollback

### Rolling Back Deployment Artifacts

1. **Backend Rollback**:
   - Identify previous working image tag (e.g., `ghcr.io/org/social-network-backend:main-sha-abcdef`).
   - Trigger redeploy with `IMAGE_TAG=main-sha-abcdef`:
     ```bash
     IMAGE_TAG=main-sha-abcdef docker compose -f docker-compose.prod.yml up -d --no-deps backend
     ```
2. **Frontend Rollback**:
   - Rollback Vercel deployment instantly:
     ```bash
     vercel rollback <deployment-id>
     ```
3. **Database Schema Rollback**:
   - Run rollback preview script:
     ```bash
     bash scripts/rollback-migration.sh
     ```
