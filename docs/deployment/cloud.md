# ☁️ Cloud Deployment Guide (Vercel + Render + UptimeRobot)

This guide walks through deploying the platform in a production cloud environment utilizing **Vercel** for the React frontend SPA, **Render.com** for the NestJS API with native WebSocket support, and **UptimeRobot** for continuous keep-alive monitoring.

---

## 🏗️ Cloud Topology Overview

```
                        +----------------------+
                        |   Vercel (Frontend)  |
                        |   React 19 SPA + Vite|
                        +----------+-----------+
                                   |
                          HTTPS / WSS Gateway
                                   |
                                   v
+------------------+    +----------------------+
|   UptimeRobot    +--->|   Render (Backend)   |
| (5-min Keepalive)|    |   NestJS Web Service |
+------------------+    +----------+-----------+
                                   |
                   +---------------+---------------+
                   |                               |
                   v                               v
        +--------------------+          +--------------------+
        | Managed PostgreSQL |          | Managed Redis 7    |
        | (Neon / TiDB / RDS)|          | (Upstash / Redis)  |
        +--------------------+          +--------------------+
```

---

## 1. 🌐 Frontend Deployment (Vercel)

Vercel provides edge-optimized static asset distribution with instant atomic deployments on Git push.

### Step-by-Step Setup

1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New Project** and connect your GitHub repository.
3. Configure build and directory settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `pnpm --filter frontend build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `pnpm install`
4. Add Environment Variables:
   - `VITE_API_URL`: `https://<your-render-backend>.onrender.com/api`
   - `VITE_WS_URL`: `https://<your-render-backend>.onrender.com/messenger`
5. Click **Deploy**.

---

## 2. ⚡ Backend Deployment (Render.com)

Render provides containerized web services with native support for persistent HTTP/2 and WebSocket connections.

### Setup using Render Blueprint (`render.yaml`)

The repository includes a root `render.yaml` infrastructure definition:

1. In Render, navigate to **Blueprints** -> **New Blueprint Instance**.
2. Connect your GitHub repository. Render will automatically read `render.yaml`.
3. Set the required production environment secrets:
   - `DATABASE_URL`: Production PostgreSQL connection string.
   - `REDIS_URL`: Production Redis connection string.
   - `JWT_SECRET`: Random 64-character hex secret.
   - `REFRESH_TOKEN_SECRET`: Random 64-character hex secret.
   - `CORS_ORIGIN`: Your Vercel domain (e.g. `https://socialnetwork.vercel.app`).
   - `PORT`: `3000`
4. Click **Apply** to trigger deployment.

---

## 3. ⏱️ WebSocket Keep-Alive Stability (UptimeRobot)

Free or starter cloud tiers may sleep after 15 minutes of inbound HTTP inactivity. To ensure uninterrupted WebSockets and background BullMQ workers:

1. Create a free account at [UptimeRobot](https://uptimerobot.com).
2. Click **Add New Monitor**:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Social Network Backend Health`
   - **URL**: `https://<your-render-backend>.onrender.com/api/health`
   - **Monitoring Interval**: `5 minutes`
3. Save the monitor. This scheduled ping keeps the process active 24/7.

---

## 🔒 Custom Domains & Cloudflare SSL/TLS

For custom domain routing (`socialnetwork.dev` and `api.socialnetwork.dev`):

1. Point your domain nameservers to **Cloudflare**.
2. In Cloudflare SSL/TLS settings, select **Full (Strict)**.
3. Configure DNS records:
   - `CNAME @` -> `cname.vercel-dns.com` (Frontend)
   - `CNAME api` -> `<your-render-backend>.onrender.com` (Backend)
4. Enable **WebSockets** in Cloudflare Network settings.
