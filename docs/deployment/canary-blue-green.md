# 🐥 Canary & Blue-Green Deployment Strategy

This guide describes how to execute Canary rollouts and Blue-Green zero-downtime deployments on Vercel and Render/Docker Compose.

---

## 🟢 Frontend Canary & Blue-Green (Vercel)

Vercel provides native Preview Deployments and weighted traffic allocation:

### 1. Preview Deployments (Canary Testing)

- Every Pull Request automatically generates an isolated preview URL:
  `https://social-network-git-feature-x.vercel.app`
- Staging QA, automated Cypress/Playwright suites, and Lighthouse CI run against preview URLs before code enters `main`.

### 2. Weighted Traffic Splits

To test new releases with a percentage of real users:

1. Deploy new version to production without switching main traffic:
   ```bash
   vercel deploy --prod=false
   ```
2. Allocate traffic in Vercel Dashboard or CLI (e.g. 10% Canary, 90% Stable).
3. Monitor error rates in Sentry and Prometheus.
4. Promote to 100% after verification or instantly revert on error rate spike.

---

## ⚡ Backend Blue-Green Deployments (Render / Docker)

### 1. Zero-Downtime Rollouts on Render

- Render Blueprints utilize health check gates (`order: start-first`).
- The new container instance boots and passes `/api/health` probes before the previous instance receives `SIGTERM`.

### 2. Upstream Traffic Splitting (Nginx / Cloudflare)

When deploying self-hosted instances behind Nginx:

```nginx
upstream backend_cluster {
    server backend-blue:3000 weight=90;
    server backend-green:3000 weight=10;
}

server {
    listen 80;
    location /api {
        proxy_pass http://backend_cluster;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
