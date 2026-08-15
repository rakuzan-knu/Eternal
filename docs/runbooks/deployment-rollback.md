# Runbook: Deployment Rollback

## 1. Trigger Conditions

Execute immediate rollback if any of the following occur within **15 minutes** of deployment:

- HTTP 5xx error rate spikes above **1%**.
- P99 latency exceeds **1,500ms**.
- Core user flows (Login, Feed load, Direct messaging) fail in smoke tests.
- Database connection pool exhaustion or unrecoverable lock contention.

---

## 2. Docker Compose Rollback

```bash
# 1. Identify previous stable image tag
docker images --filter "reference=social-network-backend"

# 2. Update image tag in docker-compose.prod.yml or environment
export BACKEND_IMAGE_TAG="v1.0.3"
export FRONTEND_IMAGE_TAG="v1.0.3"

# 3. Pull and restart containers with zero-downtime rolling restart
docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend frontend

# 4. Verify health status
docker-compose -f docker-compose.prod.yml ps
curl -I http://localhost:3000/health
```

---

## 3. Kubernetes Blue/Green & Canary Rollback

If deploying on Kubernetes:

```bash
# 1. Rollback Helm or Deployment revision
kubectl rollout undo deployment/backend-deployment -n production
kubectl rollout undo deployment/frontend-deployment -n production

# 2. Check rollout status
kubectl rollout status deployment/backend-deployment -n production

# 3. Drain and switch ingress traffic immediately back to Blue
kubectl set service backend-service app=backend-blue -n production
```

---

## 4. Post-Rollback Verification

1. Verify `/health` and `/health/live` return 200 OK.
2. Confirm Redis connections and BullMQ workers resume normal queue processing.
3. Notify the engineering team in `#deployments` channel with the rollback reason.
