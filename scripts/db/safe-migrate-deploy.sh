#!/usr/bin/env bash

# Safe Prisma Migration Execution Wrapper
# Validates schema changes and executes non-blocking database migrations.

set -e

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "🛡️ Starting Safe Database Migration Procedure..."

# 1. Run static validation on migrations
node scripts/db/validate-prisma-migrations.cjs

# 2. Check Database URL
if [ -z "$DATABASE_URL" ]; then
  log "⚠️ DATABASE_URL is not set. Skipping live migration step."
  exit 0
fi

# 3. Apply schema migrations safely with Prisma
log "🚀 Executing 'npx prisma migrate deploy'..."
cd backend
npx prisma migrate deploy

log "✅ Database migrations successfully applied with zero-downtime safety!"
