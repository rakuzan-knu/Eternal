# 🚨 Emergency Procedure: Multi-Region Disaster Recovery (DR) Failover Runbook

This runbook outlines the step-by-step procedure for executing an automated or manual cross-region Disaster Recovery failover in response to a primary cloud region outage (e.g. AWS `us-east-1` or Render Primary region failure).

---

## 🎯 Emergency Recovery Objectives

- **Recovery Time Objective (RTO)**: `< 2 minutes` (Automated via Cloudflare Anycast & Health Monitors).
- **Recovery Point Objective (RPO)**: `< 1 minute` (Asynchronous Database & Storage Replication).

---

## ⚡ 1. Trigger Conditions & Detection

Emergency failover is initiated when:

1. Primary API backend `/api/health` probes fail continuously for 60 seconds (2 consecutive monitor intervals).
2. Primary cloud provider availability zone undergoes critical outage.

---

## 🛠️ 2. Automated Runbook Execution (`scripts/deploy/execute-dr-failover.cjs`)

To execute an emergency failover or periodic DR drill, run the automated failover tool:

```bash
# Test failover execution in dry-run mode
node scripts/deploy/execute-dr-failover.cjs --dry-run

# Trigger active failover to Secondary EU Region
node scripts/deploy/execute-dr-failover.cjs --target-region=eu-secondary
```

### Script Execution Sequence:

1. **Health Verification**: Probes secondary origin (`eu-secondary.api.socialnetwork.dev/api/health`) to confirm secondary database and API readiness.
2. **DNS Pool Switch**: Updates Cloudflare Load Balancer pool priorities, making `secondary-eu-backend-pool` active primary.
3. **DB Replica Promotion**: Signals Supabase / Neon / RDS read-replica to promote to writable primary database.
4. **Traffic Validation**: Verifies zero-downtime HTTP status on global domain.

---

## 🔁 3. Failback Procedure (Restoring Primary Region)

Once primary region health is fully restored:

```bash
node scripts/deploy/execute-dr-failover.cjs --target-region=us-primary
```

---

## 📊 4. Automated Daily DR Drills (`.github/workflows/dr-failover-drill.yml`)

DR drills run automatically on a bi-weekly schedule (`cron: '0 4 */14 * *'`) to continuously validate failover readiness without customer disruption.
