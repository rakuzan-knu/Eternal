# ⚙️ Operations & Site Reliability Engineering (SRE)

This section contains operational guidelines, resilience policies, zero-downtime maintenance procedures, and performance benchmarks for the Social Network production infrastructure.

---

## 📑 Operations Documentation Index

| Guide                                                                 | Focus Area                             | Key Objectives                                                              |
| :-------------------------------------------------------------------- | :------------------------------------- | :-------------------------------------------------------------------------- |
| **[Database Migrations (Expand/Contract)](database-migrations.md)**   | Zero-downtime schema evolution         | 3-phase rollout, backward-compatible DDL, static migration linting          |
| **[High Availability & Disaster Recovery](ha-dr.md)**                 | Multi-region fault tolerance           | Cloudflare edge routing, primary-replica DB replication, RPO < 1m, RTO < 5m |
| **[Backup & Cross-Region Replication](backup-replication.md)**        | Data protection & cryptographic backup | Automated `pg_dump`, AES-256 encryption, S3 cross-region sync               |
| **[Performance Tuning & Stress Benchmarking](performance-tuning.md)** | High-throughput optimization           | Postgres buffer pools, Redis memory eviction, k6 & Autocannon benchmarks    |

---

## 🎯 Reliability & Availability Targets

| Metric                             | Target                 | Measurement Window      | Action on Violation                           |
| :--------------------------------- | :--------------------- | :---------------------- | :-------------------------------------------- |
| **Service Availability (SLA)**     | `99.95%`               | Rolling 30 days         | Trigger SEV-1 incident review                 |
| **P95 API Latency**                | `≤ 120ms`              | 5-minute rolling window | Scale Fastify cluster or inspect slow queries |
| **Recovery Point Objective (RPO)** | `< 1 minute`           | Disaster Recovery       | Failover to standby database replica          |
| **Recovery Time Objective (RTO)**  | `< 5 minutes`          | Disaster Recovery       | Execute automated Cloudflare DNS failover     |
| **Error Rate Budget**              | `< 0.05%` (5xx errors) | 1-hour window           | Halt canary deployment, initiate rollback     |

---

## 🔄 Zero-Downtime Philosophy

To support uninterrupted social networking operations worldwide, all deployments and schema modifications adhere to:

1. **Non-Breaking Schema Evolution**: Never execute destructive DDL (`DROP COLUMN`, `RENAME COLUMN`, `SET NOT NULL` without `DEFAULT`) in active production without following the Expand/Contract cycle.
2. **Automated Pre-Merge Migration Linting**: Pull requests with SQL migrations must pass `node scripts/db/validate-prisma-migrations.cjs` in CI.
3. **Graceful Connection Draining**: Fastify and Socket.IO servers listen for `SIGTERM` signals, stop accepting new connections, drain existing WebSocket rooms, and flush queue jobs cleanly before terminating.

---

## 🚨 Emergency Procedures

In the event of an active outage or system degradation, consult our executable [Operational Runbooks](../runbooks/README.md).
