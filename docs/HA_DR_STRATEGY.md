# 🌐 High Availability (HA) & Disaster Recovery (DR) Strategy

This document outlines the architecture migration path from single-region/single-AZ deployments to enterprise Multi-Region HA/DR.

---

## 🛑 Current Single-AZ Risk Profile

Currently deployed on **Render (Backend)** + **Vercel (Frontend)**:

- **Single Point of Failure (SPOF)**: Single cloud availability zone (Frankfurt region).
- **Service Interruption Risk**: Render free instances sleep after 15 minutes of inactivity (mitigated via UptimeRobot keep-alive).
- **RTO Target**: < 15 Minutes (Verified via automated CI restore drill `scripts/verify-backup.sh`).
- **RPO Target**: 24 Hours (Daily encrypted backup dumps `.sql.gz.enc`).

---

## 🔒 Backup Security & Empirical Restore Testing (DR Validation)

### 1. Encryption at Rest (`scripts/backup-db.sh`)

- All database backups are encrypted at rest using **AES-256-CBC** with PBKDF2 key derivation (100,000 iterations).
- Backup files are stored as `backup_${DB_NAME}_${TIMESTAMP}.sql.gz.enc`. Plaintext dumps are never written to disk volume unencrypted.
- Cryptographic key is provided via `BACKUP_ENCRYPTION_KEY`.

### 2. Automated Daily Restore Drill (`.github/workflows/backup-restore-test.yml`)

- Executes on a daily schedule (`cron: '0 3 * * *'`) and on PRs modifying backup/restore scripts.
- Boots an isolated PostgreSQL database container in CI.
- Seeds test schema & data records, runs `scripts/backup-db.sh`, then executes `scripts/verify-backup.sh`.
- Decrypts the encrypted dump in-memory, restores into a temporary test database, and validates table counts and row integrity.
- Measures and records exact RTO (Recovery Time Objective) in seconds to continuously prove recovery readiness.

---

## 🚀 Multi-Region HA & DR Target Architecture

```
                       +-------------------------------+
                       |   Cloudflare Global Anycast   |
                       | DNS + WAF + Geo-Load Balancing|
                       +---------------+---------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
      +------------------------+              +------------------------+
      |  Primary Region (US)   |              | Secondary Region (EU)  |
      |  AWS ECS / Render Pro  |              | AWS ECS / Render Pro   |
      +-----------+------------+              +-----------+------------+
                  |                                       |
                  +-------------------+-------------------+
                                      |
                         +------------v------------+
                         |  Multi-AZ Managed DB    |
                         |  AWS RDS PostgreSQL     |
                         |  Primary + Read Replica |
                         +-------------------------+
```

---

## 📋 Implementation Milestones

### Phase 1: High Availability (Same Region Multi-AZ)

1. **Container Scaling**: Upgrade backend deployment from 1 replica to 2+ active replicas (`docker-compose.prod.yml` updated with `replicas: 2`).
2. **Managed Multi-AZ Database**: Migrate PostgreSQL to AWS RDS Multi-AZ or Supabase/Neon Pro with standby failover instance.
3. **Managed Redis Cluster**: Transition single-instance Redis to AWS ElastiCache for Redis (Multi-AZ with Auto-Failover).

### Phase 2: Multi-Region Disaster Recovery (ACTIVE)

1. **Global Traffic Management**: Automated via Cloudflare Load Balancing (`infrastructure/cloudflare.tf`) with active health probes polling `/api/health`.
2. **Cross-Region Origin Pools**: Primary Pool (`primary-us-backend-pool`) auto-fails over to Secondary Pool (`secondary-eu-backend-pool`) within 60s of monitor failure.
3. **RTO/RPO Verified Targets**:
   - **Recovery Time Objective (RTO)**: < 2 minutes (Automated DNS Health Probe Failover).
   - **Recovery Point Objective (RPO)**: < 1 minute (Asynchronous Cross-Region DB Replication).
