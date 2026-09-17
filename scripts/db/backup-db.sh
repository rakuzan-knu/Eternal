#!/bin/bash

# PostgreSQL Backup Script with AES-256-CBC Encryption at Rest
# Usage: ./scripts/db/backup-db.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_NAME="${POSTGRES_DB:-social}"
DB_USER="${POSTGRES_USER:-user}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-default_dev_backup_key_32_bytes_min}"

# File path for encrypted archive
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql.gz.enc"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Log function
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Export password to avoid prompt
export PGPASSWORD="${POSTGRES_PASSWORD}"

log "Starting encrypted PostgreSQL backup..."
log "Database: $DB_NAME"
log "Host: $DB_HOST:$DB_PORT"
log "Encryption Standard: AES-256-CBC (PBKDF2 iter: 100,000)"

# Perform backup with inline stream compression and AES-256-CBC encryption
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password | \
   gzip | \
   openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -pass pass:"${BACKUP_ENCRYPTION_KEY}" > "${BACKUP_FILE}"; then

  # Test archive integrity via streaming decryption and gzip test
  if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass pass:"${BACKUP_ENCRYPTION_KEY}" -in "${BACKUP_FILE}" | gzip -t 2>/dev/null; then
    log "❌ Backup file integrity check failed! Encrypted archive is corrupted or key mismatch."
    rm -f "${BACKUP_FILE}"
    exit 1
  fi

  BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  log "✅ Backup completed, encrypted & verified successfully: $BACKUP_FILE ($BACKUP_SIZE)"
  
  # Get file count before cleanup
  OLD_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 \( -name "backup_*.sql.gz" -o -name "backup_*.sql.gz.enc" \) -type f | wc -l)
  
  # Remove old backups
  log "Removing backups older than $RETENTION_DAYS days..."
  find "${BACKUP_DIR}" -maxdepth 1 \( -name "backup_*.sql.gz" -o -name "backup_*.sql.gz.enc" \) -type f -mtime +${RETENTION_DAYS} -delete
  
  # Get file count after cleanup
  NEW_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 \( -name "backup_*.sql.gz" -o -name "backup_*.sql.gz.enc" \) -type f | wc -l)
  log "Cleaned up old backups. Total backups: $NEW_COUNT (removed $((OLD_COUNT - NEW_COUNT)))"

  # Optional Cross-Region Replication to S3/GCS
  if [ -n "${BACKUP_S3_BUCKET}" ]; then
    log "Replicating backups to Cross-Region Storage: ${BACKUP_S3_BUCKET}..."
    if command -v rclone &> /dev/null; then
      rclone sync "${BACKUP_DIR}" "${BACKUP_S3_BUCKET}" --fast-list || log "⚠️ rclone replication warning"
    elif command -v aws &> /dev/null; then
      aws s3 sync "${BACKUP_DIR}" "${BACKUP_S3_BUCKET}" --delete || log "⚠️ AWS S3 sync warning"
    else
      log "ℹ️ Neither rclone nor aws CLI found. Skipping remote bucket sync."
    fi
  fi
  
  # Output metrics for Prometheus
  echo "# HELP backup_success_time_seconds Timestamp of last successful backup"
  echo "# TYPE backup_success_time_seconds gauge"
  echo "backup_success_time_seconds $(date +%s)"
  echo "# HELP backup_size_bytes Size of last backup in bytes"
  echo "# TYPE backup_size_bytes gauge"
  echo "backup_size_bytes $(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}")"
  echo "# HELP backups_total_count Total number of backups"
  echo "# TYPE backups_total_count gauge"
  echo "backups_total_count $NEW_COUNT"
else
  log "❌ Backup failed!"
  echo "# HELP backup_success_time_seconds Timestamp of last successful backup"
  echo "# TYPE backup_success_time_seconds gauge"
  echo "backup_success_time_seconds 0"
  exit 1
fi
