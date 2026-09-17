# 📡 REST API Reference

The backend exposes a structured RESTful API with JSON payloads, standard HTTP status codes, and deterministic error responses.

---

## 🌐 Base URL & Endpoints

| Environment           | Base URL                            | Notes                                             |
| :-------------------- | :---------------------------------- | :------------------------------------------------ |
| **Local Development** | `http://localhost:3000/api`         | Fastify backend server                            |
| **Production**        | `https://api.socialnetwork.dev/api` | Reverse-proxied through Cloudflare CDN            |
| **OpenAPI / Swagger** | `http://localhost:3000/api/docs`    | Interactive Swagger UI (JSON at `/api/docs-json`) |

---

## 🔑 Authentication

Protected endpoints require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

When an access token expires (`401 Unauthorized`), the client automatically requests a renewed token using `POST /api/auth/refresh`.

---

## 📋 Endpoints Directory

### 1. 🔐 Authentication (`/api/auth`)

| Method | Endpoint                | Description                                             | Auth Required |
| :----- | :---------------------- | :------------------------------------------------------ | :------------ |
| `POST` | `/auth/register`        | Register a new account (email, username, password).     | No            |
| `POST` | `/auth/login`           | Authenticate with credentials and receive tokens.       | No            |
| `POST` | `/auth/refresh`         | Renew access token using HTTP-only refresh cookie.      | No (Cookie)   |
| `POST` | `/auth/logout`          | Revoke active session and clear authentication cookies. | Yes           |
| `POST` | `/auth/forgot-password` | Request password reset token via email.                 | No            |
| `POST` | `/auth/reset-password`  | Reset account password using token.                     | No            |

---

### 2. 👤 Users & Profiles (`/api/users`)

| Method   | Endpoint                       | Description                                  | Auth Required |
| :------- | :----------------------------- | :------------------------------------------- | :------------ |
| `GET`    | `/users/me`                    | Fetch authenticated user profile & settings. | Yes           |
| `PATCH`  | `/users/me`                    | Update bio, avatar, banner, or display name. | Yes           |
| `DELETE` | `/users/me`                    | Request account deletion & data erasure.     | Yes           |
| `GET`    | `/users/:id`                   | Fetch public user profile by UUID.           | Optional      |
| `GET`    | `/users/by-username/:username` | Lookup user profile by unique handle.        | Optional      |
| `GET`    | `/users/search?q=:query`       | Search users by username or display name.    | Optional      |
| `PATCH`  | `/users/me/privacy`            | Update dimensional privacy settings.         | Yes           |
| `POST`   | `/users/:id/block`             | Block a user from interactions.              | Yes           |
| `DELETE` | `/users/:id/block`             | Unblock a user.                              | Yes           |
| `POST`   | `/users/:id/alias`             | Assign a private custom alias to a user.     | Yes           |
| `POST`   | `/users/:id/report`            | Submit an abuse report against a user.       | Yes           |

---

### 3. 📝 Posts & Feed (`/api/posts`, `/api/v1/feed`)

| Method   | Endpoint              | Description                                                | Auth Required |
| :------- | :-------------------- | :--------------------------------------------------------- | :------------ |
| `GET`    | `/posts`              | Paginated timeline feed (cursor-based pagination).         | Optional      |
| `GET`    | `/feed/compact`       | BFF lightweight feed (author, media preview, precomputed). | Optional      |
| `POST`   | `/posts`              | Create new post (text, media attachments, poll).           | Yes           |
| `GET`    | `/posts/:id`          | Retrieve single post by ID with comments.                  | Optional      |
| `PATCH`  | `/posts/:id`          | Edit post content (owner only).                            | Yes           |
| `DELETE` | `/posts/:id`          | Delete post (owner or moderator only).                     | Yes           |
| `POST`   | `/posts/:id/like`     | Like a post.                                               | Yes           |
| `DELETE` | `/posts/:id/like`     | Unlike a post.                                             | Yes           |
| `POST`   | `/posts/:id/repost`   | Share/repost to follower feed.                             | Yes           |
| `POST`   | `/posts/:id/save`     | Bookmark post to saved items.                              | Yes           |
| `DELETE` | `/posts/:id/save`     | Remove bookmark.                                           | Yes           |

---

### 4. 💬 Comments (`/api/comments` & `/api/posts/:id/comments`)

| Method   | Endpoint              | Description                                     | Auth Required |
| :------- | :-------------------- | :---------------------------------------------- | :------------ |
| `GET`    | `/posts/:id/comments` | Fetch threaded comments for a post.             | Optional      |
| `POST`   | `/posts/:id/comments` | Post a top-level comment or reply (`parentId`). | Yes           |
| `PATCH`  | `/comments/:id`       | Update comment text.                            | Yes           |
| `DELETE` | `/comments/:id`       | Remove comment.                                 | Yes           |
| `POST`   | `/comments/:id/like`  | Like a comment.                                 | Yes           |
| `DELETE` | `/comments/:id/like`  | Unlike a comment.                               | Yes           |

---

### 5. 📊 Polls (`/api/poll`)

| Method | Endpoint             | Description                                     | Auth Required |
| :----- | :------------------- | :---------------------------------------------- | :------------ |
| `POST` | `/poll/:pollId/vote` | Cast vote on a specific poll option.            | Yes           |
| `GET`  | `/poll/:pollId`      | Fetch poll results, voter percentages & status. | Optional      |

---

### 6. 📱 Stories (`/api/stories`)

| Method   | Endpoint                 | Description                                             | Auth Required |
| :------- | :----------------------- | :------------------------------------------------------ | :------------ |
| `GET`    | `/stories`               | Fetch active stories of followed users & close friends. | Yes           |
| `POST`   | `/stories`               | Publish ephemeral 24-hour story with media/poll.        | Yes           |
| `GET`    | `/stories/:id`           | View specific story details.                            | Yes           |
| `DELETE` | `/stories/:id`           | Delete story before expiration.                         | Yes           |
| `POST`   | `/stories/:id/view`      | Record view event (increments viewer list).             | Yes           |
| `POST`   | `/stories/:id/react`     | Send emoji reaction to story author.                    | Yes           |
| `POST`   | `/stories/:id/poll/vote` | Vote in a story sticker poll.                           | Yes           |

---

### 7. 💬 Messenger & Chat (`/api/chat`)

| Method   | Endpoint                           | Description                                       | Auth Required |
| :------- | :--------------------------------- | :------------------------------------------------ | :------------ |
| `GET`    | `/chat/conversations`              | List user active conversations with last message. | Yes           |
| `POST`   | `/chat/conversations`              | Initiate direct 1-on-1 or group conversation.     | Yes           |
| `GET`    | `/chat/conversations/:id`          | Fetch conversation metadata & participant list.   | Yes           |
| `GET`    | `/chat/conversations/:id/messages` | Paginated message history (cursor-based).         | Yes           |
| `POST`   | `/chat/conversations/:id/messages` | Send a new message (plaintext or E2EE envelope).  | Yes           |
| `DELETE` | `/chat/messages/:id`               | Delete message (for self or for everyone).        | Yes           |
| `POST`   | `/chat/messages/:id/reactions`     | Add or toggle emoji reaction on a message.        | Yes           |

---

### 8. 🏆 Showcase & Badges (`/api/showcase`)

| Method   | Endpoint            | Description                                     | Auth Required |
| :------- | :------------------ | :---------------------------------------------- | :------------ |
| `GET`    | `/showcase/:userId` | Retrieve customized profile showcase items.     | Optional      |
| `POST`   | `/showcase`         | Add item or featured badge to profile showcase. | Yes           |
| `PATCH`  | `/showcase/:id`     | Reorder showcase items.                         | Yes           |
| `DELETE` | `/showcase/:id`     | Remove item from profile showcase.              | Yes           |

---

### 9. 🔔 Notifications (`/api/notifications`)

| Method  | Endpoint                  | Description                                     | Auth Required |
| :------ | :------------------------ | :---------------------------------------------- | :------------ |
| `GET`   | `/notifications`          | Fetch paginated notification feed.              | Yes           |
| `PATCH` | `/notifications/:id/read` | Mark single notification as read.               | Yes           |
| `PATCH` | `/notifications/read-all` | Mark all notifications as read.                 | Yes           |
| `GET`   | `/notifications/settings` | Get user notification delivery preferences.     | Yes           |
| `PATCH` | `/notifications/settings` | Update alert preferences per activity category. | Yes           |

---

### 10. 💻 Sessions & Devices (`/api/sessions`)

| Method   | Endpoint          | Description                                     | Auth Required |
| :------- | :---------------- | :---------------------------------------------- | :------------ |
| `GET`    | `/sessions`       | List active sessions (device, IP, last active). | Yes           |
| `DELETE` | `/sessions/:id`   | Revoke a specific remote device session.        | Yes           |
| `DELETE` | `/sessions/other` | Terminate all other sessions except current.    | Yes           |

---

### 11. 🐙 GitHub Integration (`/api/github`)

| Method   | Endpoint             | Description                                  | Auth Required |
| :------- | :------------------- | :------------------------------------------- | :------------ |
| `GET`    | `/github/connect`    | Initiates GitHub OAuth flow to link account. | Yes           |
| `GET`    | `/github/callback`   | OAuth callback exchange.                     | Yes           |
| `POST`   | `/github/sync-prs`   | Resync merged PRs count and award badges.    | Yes           |
| `DELETE` | `/github/disconnect` | Unlink GitHub account from profile.          | Yes           |

---

### 12. 🔗 OpenGraph Link Previews (`/api/opengraph`)

| Method | Endpoint                         | Description                                         | Auth Required |
| :----- | :------------------------------- | :-------------------------------------------------- | :------------ |
| `GET`  | `/opengraph/preview?url=:target` | Scrapes OpenGraph tags (title, description, image). | Yes           |

---

### 13. 🩺 Health & Observability (`/api/health`, `/metrics`)

| Method | Endpoint           | Description                                       | Auth Required       |
| :----- | :----------------- | :------------------------------------------------ | :------------------ |
| `GET`  | `/health`          | Terminus overall readiness probe (DB, Redis, S3). | No                  |
| `GET`  | `/health/liveness` | Minimal liveness ping for container orchestrator. | No                  |
| `GET`  | `/metrics`         | Prometheus metrics scrape endpoint.               | Internal / IP Gated |

---

### 14. 🚩 Feature Flags (`/api/flags`)

| Method   | Endpoint             | Description                                                   | Auth Required |
| :------- | :------------------- | :------------------------------------------------------------ | :------------ |
| `GET`    | `/flags`             | Evaluate all active feature flags for the current viewer.     | Optional      |
| `GET`    | `/flags/:key`        | Evaluate a specific feature flag by key.                      | Optional      |
| `GET`    | `/flags/admin/list`  | List all feature flag configurations (Admin).                 | Yes           |
| `POST`   | `/flags/admin`       | Create a new feature flag definition (Admin).                 | Yes           |
| `PATCH`  | `/flags/admin/:key`  | Update rollout percentage or enabled state for a flag (Admin).| Yes           |
| `DELETE` | `/flags/admin/:key`  | Remove a feature flag definition (Admin).                     | Yes           |

