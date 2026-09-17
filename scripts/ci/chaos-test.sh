#!/bin/bash

# Staging Failure Injection & Chaos Engineering Test Script
# Usage: ./scripts/ci/chaos-test.sh [scenario]

set -e

SCENARIO="${1:-all}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] [CHAOS] $1"
}

log "💥 Starting Failure Injection Test Suite (Scenario: ${SCENARIO})"

test_redis_failure() {
  log "Scenario 1: Simulating Redis Cache Outage..."
  docker compose -f "$COMPOSE_FILE" stop redis
  sleep 5
  log "Checking Backend resilience during Redis outage..."
  if curl -sf http://localhost:3000/health > /dev/null; then
    log "✅ Backend handled Redis outage gracefully."
  else
    log "⚠️ Backend health check degraded during Redis failure."
  fi
  log "Restoring Redis service..."
  docker compose -f "$COMPOSE_FILE" start redis
  sleep 5
}

test_postgres_latency() {
  log "Scenario 2: Simulating PostgreSQL DB Latency & Reconnect..."
  docker compose -f "$COMPOSE_FILE" pause postgres
  sleep 5
  log "Unpausing PostgreSQL DB..."
  docker compose -f "$COMPOSE_FILE" unpause postgres
  sleep 3
  if curl -sf http://localhost:3000/health > /dev/null; then
    log "✅ Backend reconnected to PostgreSQL successfully."
  else
    log "❌ Backend failed to reconnect to PostgreSQL."
  fi
}

test_backend_restart() {
  log "Scenario 3: Simulating Backend Crash & Auto-Restart..."
  docker compose -f "$COMPOSE_FILE" restart backend
  sleep 8
  if curl -sf http://localhost:3000/health > /dev/null; then
    log "✅ Backend restarted and recovered health check."
  else
    log "❌ Backend failed to recover after restart."
  fi
}

case "$SCENARIO" in
  redis)
    test_redis_failure
    ;;
  postgres)
    test_postgres_latency
    ;;
  backend)
    test_backend_restart
    ;;
  all)
    test_redis_failure
    test_postgres_latency
    test_backend_restart
    ;;
  *)
    log "Unknown scenario: $SCENARIO. Options: redis, postgres, backend, all"
    exit 1
    ;;
esac

log "🎉 Chaos engineering test scenario complete."
