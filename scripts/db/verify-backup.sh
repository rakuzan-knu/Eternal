#!/bin/bash

# Database Backup Restore Drill & Verification Script
# Usage: ./scripts/db/verify-backup.sh [backup_file_path]
# Restores encrypted/gzip backups into an isolated temporary test DB.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ]; then
  shopt -s nullglob
  for candidate in "$BACKUP_DIR"/backup_*; do
    if [ -f "$candidate" ] && { [ -z "$BACKUP_FILE" ] || [ "$candidate" -nt "$BACKUP_FILE" ]; }; then
      BACKUP_FILE="$candidate"
    fi
  done
  shopt -u nullglob
fi

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  log "❌ Error: No valid backup file found for verification drill in ${BACKUP_DIR}."
  exit 1
fi

log "🔍 Starting Automated Database Restore Drill on backup file: ${BACKUP_FILE}"
START_TIME=$(date +%s)

# Step 1: Check Archive Integrity & Decrypt Stream
log "Step 1: Checking archive integrity & decrypting if needed..."

if [[ "$BACKUP_FILE" == *.enc ]]; then
  : "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required for encrypted backups}"
  export BACKUP_ENCRYPTION_KEY
  log "🔒 Decrypting AES-256-CBC backup archive..."
  if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass env:BACKUP_ENCRYPTION_KEY -in "$BACKUP_FILE" | gzip -t 2>/dev/null; then
    log "❌ Archive integrity check failed! Decryption failed or file is corrupted."
    exit 1
  fi
else
  log "📦 Non-encrypted legacy gzip archive detected."
  if ! gunzip -t "$BACKUP_FILE"; then
    log "❌ Archive integrity check failed! Backup file is corrupted."
    exit 1
  fi
fi

restore_stream() {
  if [[ "$BACKUP_FILE" == *.enc ]]; then
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass env:BACKUP_ENCRYPTION_KEY -in "$BACKUP_FILE" | gunzip -c
  else
    gunzip -c "$BACKUP_FILE"
  fi
}

log "✅ Archive integrity test passed."

# Step 2: Prepare Temporary Isolated Test Database
TEST_DB_NAME="restore_test_$(date +%s)_$$_${RANDOM}"
TEST_HOST="${POSTGRES_HOST:-postgres}"
TEST_PORT="${POSTGRES_PORT:-5432}"
TEST_USER="${POSTGRES_USER:-user}"
export PGPASSWORD="${POSTGRES_PASSWORD:-${PGPASSWORD:-}}"

log "Step 2: Creating temporary test database '${TEST_DB_NAME}'..."
createdb -h "$TEST_HOST" -p "$TEST_PORT" -U "$TEST_USER" "$TEST_DB_NAME" || {
  log "❌ Failed to create temporary test database."
  exit 1
}

# Cleanup hook on exit
cleanup() {
  local status=$?
  log "Cleaning up temporary test database '${TEST_DB_NAME}'..."
  if ! dropdb -h "$TEST_HOST" -p "$TEST_PORT" -U "$TEST_USER" --if-exists "$TEST_DB_NAME"; then
    log "❌ Cleanup failed: temporary test database '${TEST_DB_NAME}' may still exist." >&2
    if [ "$status" -eq 0 ]; then
      status=1
    fi
  fi
  exit "$status"
}
trap cleanup EXIT

# Step 3: Restore Dump into Temporary Database
log "Step 3: Restoring SQL dump into temporary database..."
if ! restore_stream | psql -X -v ON_ERROR_STOP=1 -h "$TEST_HOST" -p "$TEST_PORT" -U "$TEST_USER" -d "$TEST_DB_NAME" > /dev/null 2>&1; then
  log "❌ Restore drill failed: backup stream or SQL restoration failed."
  exit 1
fi

# Step 4: Verify Public Tables Were Restored
log "Step 4: Verifying restored public table count..."
TABLE_COUNT=$(psql -X -v ON_ERROR_STOP=1 -h "$TEST_HOST" -p "$TEST_PORT" -U "$TEST_USER" -d "$TEST_DB_NAME" -At -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")

END_TIME=$(date +%s)
DRILL_DURATION=$((END_TIME - START_TIME))

if [[ "$TABLE_COUNT" =~ ^[0-9]+$ ]] && [ "$TABLE_COUNT" -gt 0 ]; then
  log "✅ Restore drill successful! Restored ${TABLE_COUNT} public tables."
  log "⏱️ Restore drill completed in ${DRILL_DURATION} seconds."
  log "🎉 Archive, SQL restore and public table checks passed. RPO and application data integrity require separate verification."
else
  log "❌ Restore drill failed: no valid public table count after restoring dump."
  exit 1
fi
