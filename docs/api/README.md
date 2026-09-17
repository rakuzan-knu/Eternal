# 📡 API Specifications & Protocol Contracts

The Social Network platform exposes dual communication interfaces: a strongly typed **REST API** for CRUD and query workflows, and a low-latency **WebSocket Gateway** for instant messaging, live presence, and push notifications.

All payloads are validated against single-source-of-truth **Zod contracts**, ensuring zero drift between backend endpoints and frontend consumers.

---

## 🗺️ API Documentation Directory

| Document                                     | Focus Area                                                       | Primary Audience                                |
| :------------------------------------------- | :--------------------------------------------------------------- | :---------------------------------------------- |
| **[REST API Reference](http-api.md)**        | Endpoints, query parameters, request/response bodies, pagination | Frontend developers, external integrations      |
| **[WebSocket Event Protocol](websocket.md)** | Real-time events, Socket.IO rooms, presence, ack callbacks       | Real-time feature engineers, mobile/web clients |
| **[Shared Zod Contracts](contracts.md)**     | Single source of truth TypeScript types & runtime schemas        | Full-stack monorepo contributors                |

---

## 🌐 Environments & Base URLs

| Environment    | REST API Base URL                   | WebSocket Endpoint                      | Interactive Swagger UI                                           |
| :------------- | :---------------------------------- | :-------------------------------------- | :--------------------------------------------------------------- |
| **Local Dev**  | `http://localhost:3000/api`         | `ws://localhost:3000/messenger`         | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) |
| **Production** | `https://api.socialnetwork.dev/api` | `wss://api.socialnetwork.dev/messenger` | Disabled in production                                           |

Interactive OpenAPI documentation is generated directly from NestJS metadata and served locally at `/api/docs` (JSON schema available at `/api/docs-json`).

---

## 🔑 Authentication Model

All protected REST and WebSocket routes require valid JSON Web Tokens (JWT):

### 1. REST Authorization Header

```http
Authorization: Bearer <access_token>
```

- Access tokens have a lifespan of **15 minutes**.
- When an access token expires (`401 Unauthorized`), the client calls `POST /api/auth/refresh`.
- Refresh tokens are stored in secure, `HttpOnly`, `SameSite=Strict` cookies.

### 2. WebSocket Handshake Authentication

```typescript
import { io } from 'socket.io-client';

const socket = io('https://api.socialnetwork.dev/messenger', {
  auth: { token: accessToken },
  transports: ['websocket'],
});
```

---

## ⚠️ Deterministic Error Format

All API errors return a consistent JSON schema across all endpoints:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "issues": [
    {
      "field": "content",
      "message": "Content exceeds maximum limit of 5000 characters"
    }
  ],
  "timestamp": "2026-09-04T18:00:00.000Z",
  "path": "/api/posts",
  "correlationId": "c9a4b890-0f2d-4867-b841-8f5bc6b3d1b7"
}
```

Every response includes the `x-correlation-id` header for distributed tracing in Sentry and Grafana Tempo.
