# Runbook: Incident Response & Severity Triage

## 1. Incident Classification

| Level     | Severity     | Examples                                            | Response SLA    | Escalation                          |
| :-------- | :----------- | :-------------------------------------------------- | :-------------- | :---------------------------------- |
| **SEV-1** | **Critical** | Full site outage, data loss, active security breach | **< 15 min**    | Tech Lead, On-Call Engineer, VP Eng |
| **SEV-2** | **Major**    | Auth failures, chat degradation, high latency (>2s) | **< 30 min**    | On-Call Engineer, Domain Lead       |
| **SEV-3** | **Moderate** | Non-critical feature broken (e.g. notifications)    | **< 2 hours**   | Assigned Engineer                   |
| **SEV-4** | **Minor**    | Cosmetic UI glitches, non-blocking bug              | **Next sprint** | Product Backlog                     |

---

## 2. Immediate Triage Checklist

1. **Verify Outage**:
   - Check Prometheus metrics at `/metrics` (HTTP 5xx rate, latency).
   - Check health endpoint: `curl -I https://api.social-network.com/health`
2. **Establish Incident Bridge**:
   - Open dedicated War Room in Slack/Discord `#incident-sev1-YYYYMMDD`.
   - Appoint **Incident Commander (IC)** and **Comms Lead**.
3. **Mitigation First, Root Cause Later**:
   - If bad release: Trigger [Deployment Rollback](./deployment-rollback.md).
   - If database load: Scale read replicas or enable Throttler strict mode.
   - If Redis memory saturation: Trigger `MEMORY PURGE` or flush transient keys.

---

## 3. Diagnostic Commands

```bash
# Check Docker container health & logs
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs --tail=100 -f backend

# Check PostgreSQL connection saturation
docker exec -it postgres psql -U user -d social -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Check Redis connection & memory
docker exec -it redis redis-cli info memory
docker exec -it redis redis-cli info clients
```

---

## 4. Post-Mortem Template

Every SEV-1 and SEV-2 requires a blameless post-mortem within **48 hours**:

- **Summary**: What happened, timeline of events (detection to resolution).
- **Impact**: User count affected, duration of degradation.
- **Root Cause**: Why did this occur (5 Whys analysis)?
- **Action Items**: Preventative measures tracked as GitHub Issues with milestones.
