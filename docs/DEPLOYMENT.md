# 🚀 Social Network Deployment & Continuous Deployment (CD) Guide

This guide describes how to deploy the Social Network application and set up Continuous Deployment (CD) using **Vercel** for the Frontend, **Render.com** for the Backend, and **UptimeRobot** for WebSocket keep-alive stability.

---

## 🏗️ Architecture Overview

```
                        +----------------------+
                        |   Vercel (Frontend)  |
                        |   React SPA + Vite   |
                        +----------+-----------+
                                   |
                         HTTP / WebSockets
                                   |
                                   v
+------------------+    +----------------------+
|   UptimeRobot    +--->|   Render (Backend)   |
| (5-min HTTP GET) |    | NestJS Web Service   |
+------------------+    +----------------------+
```

---

## 1. 🌐 Frontend Deployment (Vercel)

### Manual Initial Setup

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New Project** and import the `social-network` repository.
3. Configure project settings:
   - **Framework Preset**: Vite
   - **Build Command**: `pnpm --filter frontend build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `pnpm install`
4. Add Environment Variables:
   - `VITE_API_URL`: `https://<your-render-app>.onrender.com/api`
5. Click **Deploy**.

---

## 2. ⚡ Backend Deployment (Render.com)

Render provides a Free Web Service tier supporting native WebSockets and Socket.io.

### Setup using Render Blueprint (`render.yaml`)

1. Log in to [Render.com](https://render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository. Render will automatically detect `render.yaml`.
4. Configure required Environment Variables in Render Dashboard:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `REDIS_URL`: Your Redis connection string.
   - `JWT_SECRET`: Secret key for JWT signing.
   - `CORS_ORIGIN`: `https://<your-vercel-app>.vercel.app,http://localhost:5173`
   - `PORT`: `3000`
5. Click **Apply** to deploy the service.

---

## 3. ⏰ UptimeRobot Keep-Alive Setup (Prevent Sleeping)

Render free instances go to sleep after 15 minutes of inactivity, which drops active WebSocket connections.

### Setup Instructions

1. Register at [UptimeRobot.com](https://uptimerobot.com).
2. Click **Add New Monitor**.
3. Configure the monitor:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Social Network Backend Keep-Alive`
   - **URL (or IP)**: `https://<your-render-app>.onrender.com/ping` (or `/api/ping`)
   - **Monitoring Interval**: `Every 5 minutes`
4. Click **Create Monitor**.

---

## 4. 🔄 Socket.io Client & CORS Configuration

### Client Reconnection Strategy (`frontend/src/shared/api/socket.ts`)

```typescript
export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(`${getSocketBaseUrl()}/messenger`, {
    autoConnect: false,
    transports: ['polling', 'websocket'], // HTTP Polling fallback -> upgrade to WebSocket
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: (cb) => cb({ token: localStorage.getItem('accessToken') }),
  });

  return socket;
}
```

### Backend CORS Resolution (`backend/src/main.ts` & `messenger.gateway.ts`)

NestJS HTTP server and WebSocket Gateway accept requests from Vercel preview/production domains (`*.vercel.app`), configured `CORS_ORIGIN`, and local development environments with `credentials: true`.

---

## 5. 🤖 GitHub Actions CD Pipeline Secrets & GitOps Secrets

To enable automated deployments, secret synchronization, and backup encryption on push to `main`, set the following secrets in GitHub Repository Settings (**Settings > Secrets and variables > Actions**):

| Secret Name              | Description                              | Source                                            |
| :----------------------- | :--------------------------------------- | :------------------------------------------------ |
| `VERCEL_TOKEN`           | Vercel API Access Token                  | Vercel Account Settings > Tokens                  |
| `VERCEL_ORG_ID`          | Vercel Organization ID                   | `.vercel/project.json` or Vercel Team Settings    |
| `VERCEL_PROJECT_ID`      | Vercel Project ID                        | `.vercel/project.json` or Vercel Project Settings |
| `RENDER_DEPLOY_HOOK_URL` | Render Deploy Hook URL                   | Render Service > Settings > Deploy Hook           |
| `RENDER_SERVICE_ID`      | Render Web Service ID                    | Render Dashboard > Service Settings               |
| `RENDER_API_KEY`         | Render REST API User/Account Token       | Render Account Settings > API Keys                |
| `BACKUP_ENCRYPTION_KEY`  | AES-256-CBC PBKDF2 Secret Encryption Key | Managed KMS / Cryptographic Vault                 |
| `VITE_API_URL`           | Production Backend API URL               | `https://<your-render-app>.onrender.com/api`      |

### 🔐 GitOps Secret Management Flow (`scripts/sync-render-secrets.sh`)

Rather than manually setting environment variables via the Render UI dashboard (which causes secret drift and lacks auditability), secrets are managed via GitOps:

1. Production secret values (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `CORS_ORIGIN`) are stored in GitHub Repository Secrets or Vault.
2. `.github/workflows/deploy-backend-render.yml` invokes `scripts/sync-render-secrets.sh`.
3. Secrets are synchronized programmatically via the Render REST API (`PUT /services/{serviceId}/env-vars`).
