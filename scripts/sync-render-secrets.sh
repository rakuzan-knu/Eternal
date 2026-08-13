#!/bin/bash

# Render GitOps Secret Synchronization Script
# Usage: ./scripts/sync-render-secrets.sh [--dry-run]
# Syncs production secrets directly to Render Web Service via Render REST API,
# ensuring GitOps auditability, zero UI drift, and programmatic secret management.

set -e

DRY_RUN=false
if [ "$1" == "--dry-run" ]; then
  DRY_RUN=true
fi

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "🔒 Render GitOps Secret Synchronization Tool"

if [ -z "$RENDER_API_KEY" ] || [ -z "$RENDER_SERVICE_ID" ]; then
  log "⚠️ WARNING: RENDER_API_KEY or RENDER_SERVICE_ID not set. Skipping API sync (manual/offline mode)."
  exit 0
fi

# Define key/value pairs to sync from environment
ENV_KEYS=(
  "CORS_ORIGIN"
  "DATABASE_URL"
  "REDIS_URL"
  "JWT_SECRET"
)

PAYLOAD_ITEMS=()
SYNC_COUNT=0

for KEY in "${ENV_KEYS[@]}"; do
  VAL="${!KEY}"
  if [ -n "$VAL" ]; then
    # Escape quotes and backslashes for JSON formatting
    ESCAPED_VAL=$(echo -n "$VAL" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
    PAYLOAD_ITEMS+=("{\"key\":\"${KEY}\",\"value\":\"${ESCAPED_VAL}\"}")
    SYNC_COUNT=$((SYNC_COUNT + 1))
    log "  • Staging key for sync: ${KEY} (length: ${#VAL} chars)"
  else
    log "  • Skipping ${KEY} (environment variable not present in execution context)"
  fi
done

if [ $SYNC_COUNT -eq 0 ]; then
  log "ℹ️ No matching secret variables found in execution environment to sync."
  exit 0
fi

# Construct JSON payload array
JSON_PAYLOAD="["
for i in "${!PAYLOAD_ITEMS[@]}"; do
  JSON_PAYLOAD+="${PAYLOAD_ITEMS[$i]}"
  if [ $i -lt $((${#PAYLOAD_ITEMS[@]} - 1)) ]; then
    JSON_PAYLOAD+=","
  fi
done
JSON_PAYLOAD+="]"

if [ "$DRY_RUN" = true ]; then
  log "🔍 [DRY RUN] Would submit ${SYNC_COUNT} environment variables to Render Service ID: ${RENDER_SERVICE_ID}"
  exit 0
fi

log "🚀 Syncing ${SYNC_COUNT} environment variables to Render Service ID: ${RENDER_SERVICE_ID}..."

RESPONSE_CODE=$(curl -s -o /tmp/render_sync_response.json -w "%{http_code}" \
  -X PUT "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/env-vars" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "${JSON_PAYLOAD}")

if [ "$RESPONSE_CODE" -ge 200 ] && [ "$RESPONSE_CODE" -lt 300 ]; then
  log "✅ Successfully synchronized ${SYNC_COUNT} secret variables to Render service!"
  rm -f /tmp/render_sync_response.json
else
  log "❌ Failed to sync secrets to Render (HTTP ${RESPONSE_CODE})"
  if [ -f /tmp/render_sync_response.json ]; then
    log "Response: $(cat /tmp/render_sync_response.json)"
    rm -f /tmp/render_sync_response.json
  fi
  exit 1
fi
