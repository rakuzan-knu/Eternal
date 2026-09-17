# Runbook: Redis Automated Memory Eviction & Self-Healing

## 1. Overview & Problem Statement

When high traffic surges occur or cache generation outpaces Redis standard TTL expiration, Redis memory usage can spike towards maximum limits (OOM). If memory exceeds 90%, Redis risks dropping critical operations or throwing `OOM command not allowed` errors.

This Runbook defines the automated Self-Healing Runbook and AI Agent Ops protocol to safely detect high memory usage and evict non-critical caches in non-blocking batches (`SCAN` + `UNLINK`).

---

## 2. Trigger Criteria

- **Automated Trigger**: When Redis memory utilization $\ge 90\%$ (configurable via `REDIS_MEMORY_EVICTION_THRESHOLD`, default `0.90`).
- **Health Check Integration**: `/health` and `/health/ready` actively sample memory stats and automatically trigger self-healing.
- **Manual / AI Agent Ops Trigger**: When invoked via CLI `node scripts/utils/self-healing-redis.cjs --force` or HTTP endpoint `POST /health/self-heal`.

---

## 3. Key Classification

### Non-Critical Keys (Targeted for Eviction)

- `cache:feed:*` (User timeline and news feed caches)
- `cache:posts:*` (Rendered post payloads)
- `cache:users:*` (User profile details)
- `cache:stories:*` (Story lists)
- `cache:opengraph:*` / `og:preview:*` (Rich URL metadata)
- `cache:search:*` (Search query results)
- `cache:comments:*` (Comment pages)

### Critical Keys (Strictly Protected - NEVER Evicted)

- `session:*` (Active user session tokens)
- `auth:*` (Authentication states)
- `lock:*` (Distributed mutex locks)
- `bull:*` / `queue:*` (Background job queue state)
- `throttler:*` / `rate:*` (Rate limiting counters)
- `outbox:*` (Transactional outbox events)
- `idempotency:*` (Mutation idempotency records)

---

## 4. Runbook Execution Commands

### A. Standalone CLI Runbook

```bash
# Check memory status and run eviction if >= 90%
node scripts/utils/self-healing-redis.cjs

# Force immediate self-healing eviction
node scripts/utils/self-healing-redis.cjs --force

# Dry-run inspection
node scripts/utils/self-healing-redis.cjs --dry-run

# Custom threshold and custom patterns
node scripts/utils/self-healing-redis.cjs --threshold=85 --patterns="cache:feed:*,cache:posts:*" --json
```

### B. HTTP API Execution (Curl / AI Agent Ops)

```bash
# Inspect Redis memory
curl -X GET http://localhost:3000/health/redis-memory

# Trigger Self-Healing Runbook
curl -X POST http://localhost:3000/health/self-heal \
  -H "Content-Type: application/json" \
  -d '{"force": true, "reason": "AI Agent Ops Manual Recovery"}'
```

---

## 5. Observability & Verification

- Prometheus Gauge: `app_redis_memory_utilization_ratio`
- Prometheus Counter: `app_redis_evicted_keys_total{pattern="cache:feed:*", reason="threshold_exceeded"}`
- Health Check Response: Check `selfHealing` object in `GET /health` response.
