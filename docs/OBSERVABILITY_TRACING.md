# Distributed Tracing with OpenTelemetry & Grafana Tempo

This document outlines the distributed tracing architecture using OpenTelemetry Collector and Grafana Tempo.

## 1. Stack Architecture

- **Collector**: `otel-collector` receiving OTLP gRPC (`:4317`) and HTTP (`:4318`) traces.
- **Trace Engine**: Grafana Tempo (`http://tempo:3200`).
- **Log Engine**: Grafana Loki (`http://loki:3100`).
- **Dashboard**: Grafana (`http://localhost:3001`).

## 2. Launching Monitoring Profile

To start the full observability stack (Prometheus + Grafana + Loki + Alertmanager + Tempo + OTEL Collector):

```bash
docker compose -f docker-compose.prod.yml --profile monitoring up -d
```

## 3. Log-to-Trace Correlation

1. Open Grafana at `http://localhost:3001`.
2. Navigate to **Explore** -> select **Loki**.
3. Any log message containing `trace_id=<hash>` automatically renders a clickable button jumping directly into the **Tempo** trace timeline.
