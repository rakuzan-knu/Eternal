# 📊 Resource Limits & Database Performance Tuning Guide

This document details container resource sizing, load testing methodologies (**k6 / Artillery**), and PostgreSQL parameters for self-hosted and cloud databases (TiDB Cloud / AWS RDS).

---

## 🎛️ PostgreSQL Memory & Buffer Sizing

### General Rule of Thumb

- **`shared_buffers`**: Set to **25%** of available system RAM (for dedicated self-hosted instances).
- **`effective_cache_size`**: Set to **75%** of available system RAM.
- **`work_mem`**: `(System RAM - shared_buffers) / max_connections`.

### Configuration Matrix

| Environment                 | Host RAM     | `shared_buffers` | `work_mem`   | `effective_cache_size` | `max_connections` |
| :-------------------------- | :----------- | :--------------- | :----------- | :--------------------- | :---------------- |
| **Docker Compose Prod**     | 2 GB         | `512MB`          | `16MB`       | `1500MB`               | 100               |
| **Managed DB (TiDB Cloud)** | Auto-Managed | Auto-Managed     | Auto-Managed | Auto-Managed           | Managed           |
| **AWS RDS (db.t4g.small)**  | 2 GB         | `512MB`          | `16MB`       | `1.5GB`                | 100               |

---

## 🚀 Load Testing with k6

Load tests measure API throughput, p95 latency, and resource saturation under stress.

### Quick Run (`scripts/load-test.js`)

```bash
# Run k6 load test against backend API
k6 run --vus 50 --duration 30s scripts/load-test.js
```

### SLA Targets

- **p95 Latency**: `< 200ms` for GET endpoints
- **p99 Latency**: `< 500ms` for POST/PUT endpoints
- **HTTP Error Rate**: `< 0.01%`
