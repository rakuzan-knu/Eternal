# Monitoring & Alerting Setup

## Overview

Complete open-source monitoring stack featuring:

- **Prometheus**: Metrics collection & storage
- **Grafana**: Visualization & dashboards
- **Alertmanager**: Alert management
- **PostgreSQL Exporter**: Database metrics
- **Redis Exporter**: Cache metrics
- **Automated Backups**: Daily PostgreSQL backups with metrics

## Architecture

```
┌─────────────┐
│  Backend    │ :3000/metrics (Prometheus metrics)
└────┬────────┘
     │
     ├─→ Prometheus :9090 (scrapes every 15s)
     │    ├─→ PostgreSQL Exporter :9187
     │    ├─→ Redis Exporter :9121
     │    └─→ Alerts (rules/alerts.yml)
     │         ├─→ AlertManager :9093
     │         └─→ Webhooks (custom integrations)
     │
     └─→ Grafana :3001
          ├─→ Dashboard: Social Network - Application Monitoring
          └─→ Datasource: Prometheus
```

## Quick Start

### 1. Start Monitoring Stack

```bash
docker compose -f docker-compose.prod.yml up -d prometheus grafana postgres-exporter redis-exporter
```

### 2. Access Services

| Service                 | URL                           | Credentials |
| ----------------------- | ----------------------------- | ----------- |
| **Grafana**             | http://localhost:3001         | admin:admin |
| **Prometheus**          | http://localhost:9090         | -           |
| **Backend Metrics**     | http://localhost:3000/metrics | -           |
| **PostgreSQL Exporter** | http://localhost:9187/metrics | -           |
| **Redis Exporter**      | http://localhost:9121/metrics | -           |

### 3. Verify Metrics Collection

```bash
# Check if Prometheus is scraping targets
curl http://localhost:9090/api/v1/targets

# Check backend metrics
curl http://localhost:3000/metrics

# Check PostgreSQL metrics
curl http://localhost:9187/metrics

# Check Redis metrics
curl http://localhost:9121/metrics
```

## Metrics Collected

### Backend Metrics (`backend/src/metrics/`)

- `http_request_duration_seconds` — Request latency histogram
- `http_requests_total` — Total request count
- `http_requests_errors_total` — Error count
- `websocket_connections_active` — Active WS connections
- `database_query_duration_seconds` — Query latency
- `redis_operation_duration_seconds` — Command latency

### Database Metrics (PostgreSQL Exporter)

- `pg_stat_activity_count` — Active connections
- `pg_cache_blks_hit` — Cache hit ratio
- `pg_table_size_bytes` — Table sizes

### Redis Metrics (Redis Exporter)

- `redis_memory_used_bytes` — Memory usage
- `redis_connected_clients` — Client connections
- `redis_ops_per_sec` — Operations/second

## Backups & Retention

- **Automated Service**: `backup-service` runs daily, creating compressed SQL backups.
- **Exporter**: `backup-exporter` exposes backup metrics on port `9114`.
- **Manual Execution**:
  ```bash
  docker compose -f docker-compose.prod.yml exec backup-service /bin/bash /scripts/backup-db.sh
  ```
