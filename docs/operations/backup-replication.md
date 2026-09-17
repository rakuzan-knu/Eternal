# 💾 Cross-Region Encrypted Backup Replication

This document explains the backup encryption pipeline and replication protocol for Disaster Recovery (DR).

---

## 🔒 1. Local Encryption Pipeline

Backups are compressed with `gzip` and encrypted on-the-fly using OpenSSL **AES-256-CBC** with 100,000 PBKDF2 iterations:

```bash
pg_dump ... | gzip | openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -pass env:BACKUP_ENCRYPTION_KEY > backup.sql.gz.enc
```

---

## 🌐 2. Cross-Region Storage Replication

### Setting up AWS S3 Cross-Region Bucket

1. **Primary Bucket** (e.g. `us-east-1`): `s3://social-network-backups-primary`.
2. **Secondary DR Bucket** (e.g. `eu-central-1`): `s3://social-network-backups-dr`.
3. Configure Object Lifecycle rules to transition archives to **Glacier Instant Retrieval (`GLACIER_IR`)** after 30 days.

### Automated Replication Script

Set the target backup bucket in `docker-compose.prod.yml` or production environment:

```env
BACKUP_S3_BUCKET=s3://social-network-backups-dr
```

When `BACKUP_S3_BUCKET` is present, `scripts/db/backup-db.sh` automatically syncs verified encrypted archives using `rclone` or `aws s3 sync`.
