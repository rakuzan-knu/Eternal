#!/bin/bash

# Prisma Migration Rollback Helper Script
# Usage: ./scripts/rollback-migration.sh [steps_back]

set -e

SCHEMA_PATH="${SCHEMA_PATH:-backend/prisma/schema.prisma}"
STEPS="${1:-1}"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "⚠️ Prisma Safe Database Rollback Helper"
log "Target Schema: ${SCHEMA_PATH}"

if [ ! -f "$SCHEMA_PATH" ]; then
  log "❌ Schema file not found at ${SCHEMA_PATH}"
  exit 1
fi

log "Generating migration difference sql for review..."
npx prisma migrate diff \
  --from-schema-datamodel "$SCHEMA_PATH" \
  --to-schema-datasource "$SCHEMA_PATH" \
  --script > rollback_preview.sql

log "Rollback SQL script generated at 'rollback_preview.sql':"
cat rollback_preview.sql

log "⚠️ Review the generated rollback SQL above before executing."
log "To apply rollback, execute:"
log "  npx prisma db execute --file rollback_preview.sql --schema=${SCHEMA_PATH}"
