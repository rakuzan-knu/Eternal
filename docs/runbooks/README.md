# 📖 Operational Runbooks (SOPs)

This directory houses Standard Operating Procedures (SOPs) for site reliability, emergency incident mitigation, zero-downtime secret rotation, and disaster recovery.

---

## 🚨 Incident Severity Matrix

| Severity             | Definition                                                   | Target Response | Notification Channel           |
| :------------------- | :----------------------------------------------------------- | :-------------- | :----------------------------- |
| **SEV-1 (Critical)** | Core outage (API down, database unreachable, data loss risk) | `< 5 minutes`   | PagerDuty, Phone, Urgent Slack |
| **SEV-2 (Major)**    | Major degradation (chat gateway down, media upload failures) | `< 15 minutes`  | On-Call Slack `#alerts-prod`   |
| **SEV-3 (Minor)**    | Non-critical component degraded (e.g. link previews failing) | `< 2 hours`     | Slack `#alerts-ops`            |

---

## 📑 Runbook Catalog

| Runbook                                            | Scenario                                                        | Primary Tools                         |
| :------------------------------------------------- | :-------------------------------------------------------------- | :------------------------------------ |
| [Incident Response](incident-response.md)          | Standard triage and coordination protocol for live outages      | Sentry, Grafana, Slack                |
| [Disaster Recovery Failover](dr-failover.md)       | Multi-region emergency failover upon cloud provider outage      | Cloudflare, `execute-dr-failover.cjs` |
| [Database Restore Drill](database-restore.md)      | Emergency recovery from encrypted PostgreSQL backups            | `verify-backup.sh`, `psql`            |
| [Deployment Rollback](deployment-rollback.md)      | Immediate rollback of failed frontend or backend releases       | Vercel CLI, Render, Git               |
| [Redis Self-Healing](redis-self-healing.md)        | Redis out-of-memory mitigation and connection resets            | Redis CLI, Docker Compose             |
| [Secret & Credential Rotation](secret-rotation.md) | Zero-downtime rotation of JWT keys, database passwords, S3 keys | Render secrets, `.env`                |
