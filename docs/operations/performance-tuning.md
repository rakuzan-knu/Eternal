# 📊 Performance Tuning & Resource Limits

This guide covers PostgreSQL buffer tuning, container memory sizing, and stress-testing methodologies using **k6**, **Autocannon**, and **Clinic.js**.

---

## 🎛️ PostgreSQL Memory & Connection Sizing

### Sizing Guidelines

- **`shared_buffers`**: Allocate **25%** of host RAM for dedicated database instances.
- **`effective_cache_size`**: Set to **75%** of total host RAM.
- **`work_mem`**: `(System RAM - shared_buffers) / max_connections`.

### Configuration Matrix

| Environment                  | RAM  | `shared_buffers` | `work_mem` | `effective_cache_size` | `max_connections` |
| :--------------------------- | :--- | :--------------- | :--------- | :--------------------- | :---------------- |
| **Docker Compose Prod**      | 2 GB | `512MB`          | `16MB`     | `1500MB`               | 100               |
| **AWS RDS (db.t4g.small)**   | 2 GB | `512MB`          | `16MB`     | `1.5GB`                | 100               |
| **Managed DB (TiDB / Neon)** | Auto | Auto-Tuned       | Auto-Tuned | Auto-Tuned             | Managed           |

---

## 🚀 Stress Testing with k6

Run realistic user traffic loads against API endpoints:

```bash
# Execute 50 concurrent virtual users for 30s
pnpm benchmark:k6
```

### Production SLA Targets:

- **p95 Latency**: `< 200ms` for GET feed/profile endpoints.
- **p99 Latency**: `< 500ms` for transactional POST mutations.
- **HTTP Error Rate**: `< 0.01%`.

---

## 🔬 Node.js Profiling with Clinic.js

Diagnose event-loop bottlenecks, garbage collection pauses, and CPU spikes:

```bash
# Generate interactive CPU flamegraph
pnpm benchmark:flame

# Diagnose event loop delays and I/O saturation
pnpm benchmark:doctor
```

---

## 📦 Container Resource Limits (`docker-compose.prod.yml`)

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2048M
        reservations:
          cpus: '0.5'
          memory: 512M
```
