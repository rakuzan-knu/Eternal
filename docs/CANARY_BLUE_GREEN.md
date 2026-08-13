# 🐥 Canary & Blue-Green Deployment Strategy

This guide describes how to execute Canary and Blue-Green deployments on Vercel and Render/Docker Compose environments.

---

## 🟢 Vercel Frontend Canary & Blue-Green

Vercel provides native Preview Deployments and Traffic Allocation:

### 1. Preview Environments (Canary)

- Every Pull Request automatically receives a unique preview URL (`https://social-network-git-feature-x.vercel.app`).
- Staging QA and automated end-to-end tests run against preview URLs before merging into `main`.

### 2. Weighted Traffic Splits (Canary Routing)

- Use Vercel Skew Protection and Deployment Traffic Splits:
  1. Deploy new version to production without switching main traffic (`vercel deploy --prod=false`).
  2. Set traffic ratio in Vercel Dashboard or via CLI:
     - 10% Canary / 90% Stable.
  3. Monitor error rates in Sentry and Prometheus.
  4. Promote to 100% after verification or instant rollback on error spike.

---

## ⚡ Render & Docker Compose Backend Blue-Green

### 1. Blue-Green Rollouts on Render

- Render Blueprints utilize zero-downtime healthcheck gates (`order: start-first`).
- New container instance is built and health-checked (`/health`) before old instance receives `SIGTERM`.

### 2. Traffic Splitting with Nginx / Cloudflare

When running behind Cloudflare or Nginx:

```nginx
# Nginx Upstream Weight-based Canary
upstream backend_canary {
    server backend-blue:3000 weight=90;
    server backend-green:3000 weight=10;
}
```
