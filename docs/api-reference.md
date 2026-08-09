# API Reference

## Base URL

| Environment | URL                             |
| ----------- | ------------------------------- |
| Development | `http://localhost:3000`         |
| Production  | Configured via `VITE_API_URL`   |
| Vercel      | `/api/*` (rewritten to backend) |

## Authentication

All authenticated endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Token refresh is handled automatically by the frontend HTTP client interceptor.

---

## Health

### GET /health

Returns service health status. No auth required.

**Response**:

```json
{
  "status": "ok",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "uptime": 12345.67,
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

---

## Auth

### POST /auth/register

Create a new account. Rate limited: 5 requests per 60 seconds.

**Body**:

| Field       | Type   | Required | Rules                            |
| ----------- | ------ | -------- | -------------------------------- |
| email       | string | Yes      | Valid email, trimmed, lowercased |
| username    | string | Yes      | 3-32 chars, `a-zA-Z0-9_`         |
| displayName | string | No       | Max 64 chars                     |
| password    | string | Yes      | 8-128 chars                      |

**Response** (201):

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "displayName": "John"
  }
}
```

**Errors**: 400 (validation), 409 (email/username taken)

---

### POST /auth/login

Authenticate with email + password. Rate limited: 10 requests per 60 seconds.

**Body**:

| Field    | Type   | Required    |
| -------- | ------ | ----------- |
| email    | string | Yes         |
| password | string | Yes (min 8) |

**Response** (200): Same as register.

**Errors**: 401 (invalid credentials)

---

### POST /auth/refresh

Exchange a refresh token for a new access token.

**Body**:

| Field        | Type   | Required |
| ------------ | ------ | -------- |
| refreshToken | string | Yes      |

**Response** (200):

```json
{
  "accessToken": "eyJ..."
}
```

**Errors**: 401 (invalid/expired token)

---

### POST /auth/logout

**Auth required**. Invalidate the current refresh token.

**Body**:

| Field        | Type   | Required |
| ------------ | ------ | -------- |
| refreshToken | string | Yes      |

**Response**: 204 No Content

---

## Users

### GET /users/:id

Get public profile. No auth required.

**Response** (200):

```json
{
  "id": "uuid",
  "username": "johndoe",
  "displayName": "John",
  "avatar": "https://...",
  "bio": "Hello world",
  "createdAt": "2026-06-30T00:00:00.000Z",
  "updatedAt": "2026-07-01T00:00:00.000Z"
}
```

---

### PATCH /users/:id

**Auth required**. Update own profile only.

**Body** (all optional):

| Field       | Type   | Rules         |
| ----------- | ------ | ------------- |
| email       | string | Valid email   |
| username    | string | 3-32 chars    |
| displayName | string | Max 64 chars  |
| bio         | string | Max 300 chars |

**Response** (200): Updated `UserProfileDto`

**Errors**: 403 (not owner), 404, 409 (email/username taken)

---

### POST /users/:id/avatar

**Auth required**. Upload avatar image.

**Body**: `multipart/form-data`

| Field | Type | Rules                  |
| ----- | ---- | ---------------------- |
| file  | File | JPEG/PNG/WebP, max 5MB |

**Response** (200):

```json
{
  "id": "uuid",
  "avatar": "https://..."
}
```

---

### DELETE /users/:id/avatar

**Auth required**. Remove avatar.

**Response** (200):

```json
{
  "id": "uuid",
  "avatar": null
}
```

---

## Followers

### GET /users/:id/followers

Paginated list of followers. No auth required.

**Query**:

| Param | Type            | Default |
| ----- | --------------- | ------- |
| limit | number (1-100)  | 20      |
| after | string (cursor) | —       |

**Response** (200):

```json
{
  "data": [UserProfileDto],
  "meta": {
    "nextCursor": "uuid|null",
    "hasNextPage": true
  }
}
```

---

### GET /users/:id/following

Paginated list of following. Same shape as followers.

---

### POST /users/:id/follow

**Auth required**. Follow a user.

**Response**: 204 No Content

**Errors**: 400 (self-follow), 404, 409 (already following)

---

### DELETE /users/:id/follow

**Auth required**. Unfollow a user.

**Response**: 204 No Content

---

## Posts

### GET /posts

Get feed posts with cursor pagination. No auth required.

**Query**:

| Param | Type            | Default |
| ----- | --------------- | ------- |
| limit | number (1-100)  | 20      |
| after | string (cursor) | —       |

**Response** (200):

```json
{
  "data": [PostResponseDto],
  "meta": {
    "nextCursor": "uuid|null",
    "hasNextPage": true
  }
}
```

---

### POST /posts

**Auth required**. Create a new post.

**Body**:

| Field   | Type         | Required        |
| ------- | ------------ | --------------- |
| content | string       | Yes (non-empty) |
| image   | string (URL) | No              |

**Response** (201):

```json
{
  "id": "uuid",
  "content": "Hello world",
  "image": null,
  "authorId": "uuid",
  "createdAt": "2026-08-08T12:00:00.000Z",
  "updatedAt": "2026-08-08T12:00:00.000Z"
}
```

---

### GET /posts/:id

Get single post. No auth required.

**Response** (200): `PostResponseDto`

---

### PATCH /posts/:id

**Auth required**. Edit own post.

**Body** (all optional):

| Field   | Type         | Required                  |
| ------- | ------------ | ------------------------- |
| content | string       | No (non-empty if present) |
| image   | string (URL) | No                        |

**Response** (200): Updated `PostResponseDto`

---

### DELETE /posts/:id

**Auth required**. Delete own post.

**Response** (200)

---

## Likes

### POST /posts/:id/like

**Auth required**. Like a post.

**Response** (201)

---

### DELETE /posts/:id/like

**Auth required**. Unlike a post.

**Response** (200)

---

## Comments

### POST /posts/:id/comments

**Auth required**. Add a comment.

**Body**:

| Field | Type   | Required           |
| ----- | ------ | ------------------ |
| text  | string | Yes (1-1000 chars) |

**Response** (201):

```json
{
  "id": "uuid",
  "text": "Great post!",
  "postId": "uuid",
  "userId": "uuid",
  "createdAt": "2026-08-08T12:00:00.000Z"
}
```

---

### GET /posts/:id/comments

Paginated comments. No auth required.

**Query**:

| Param | Type            | Default |
| ----- | --------------- | ------- |
| limit | number (1-100)  | 20      |
| after | string (cursor) | —       |

**Response** (200):

```json
{
  "data": [CommentResponseDto],
  "meta": {
    "nextCursor": "uuid|null",
    "hasNextPage": true
  }
}
```

---

### DELETE /comments/:id

**Auth required**. Delete own comment.

**Response**: 204 No Content

---

## Conversations

**All conversation endpoints require authentication.**

### GET /conversations

List all conversations for current user.

**Response** (200): `ConversationView[]`

---

### GET /conversations/:id

Get single conversation with participants.

**Response** (200): `ConversationView`

---

### POST /conversations/direct

Create or get existing direct conversation.

**Body**:

| Field         | Type          | Required |
| ------------- | ------------- | -------- |
| participantId | string (UUID) | Yes      |

**Response** (201): `ConversationView`

---

### POST /conversations/group

Create a group conversation.

**Body**:

| Field       | Type             | Required      |
| ----------- | ---------------- | ------------- |
| name        | string           | Yes (max 128) |
| description | string           | No (max 512)  |
| memberIds   | string[] (UUIDs) | Yes           |

**Response** (201): `ConversationView`

---

### PATCH /conversations/:id/group

Update group info (name/description).

**Body** (all optional):

| Field       | Type             |
| ----------- | ---------------- |
| name        | string (max 128) |
| description | string (max 512) |

**Response** (200): `ConversationView`

---

### POST /conversations/:id/members

Add members to group.

**Body**:

| Field     | Type             | Required |
| --------- | ---------------- | -------- |
| memberIds | string[] (UUIDs) | Yes      |

**Response** (201)

---

### DELETE /conversations/:id/members/:userId

**Admin only**. Remove member from group.

**Response**: 204

---

### DELETE /conversations/:id/leave

Leave a conversation.

**Response**: 204

---

### POST /conversations/:id/transfer-ownership

Transfer group ownership.

**Body**:

| Field      | Type          | Required |
| ---------- | ------------- | -------- |
| newOwnerId | string (UUID) | Yes      |

**Response**: 204

---

### POST /conversations/:id/members/:userId/promote

Promote member to ADMIN.

**Response**: 204

---

### POST /conversations/:id/members/:userId/demote

Demote admin to MEMBER.

**Response**: 204

---

### PATCH /conversations/:id/nickname

Set nickname for a participant.

**Body**:

| Field        | Type          | Required                 |
| ------------ | ------------- | ------------------------ |
| targetUserId | string (UUID) | Yes                      |
| nickname     | string        | No (null clears, max 64) |

**Response**: 204

---

### PATCH /conversations/:id/theme

Set per-user theme for this conversation.

**Body**:

| Field | Type   | Required |
| ----- | ------ | -------- |
| theme | string | Yes      |

**Response**: 204

---

### PATCH /conversations/:id/mute

Mute conversation.

**Body**:

| Field      | Type           | Required              |
| ---------- | -------------- | --------------------- |
| muteLevel  | MuteLevel enum | Yes                   |
| mutedUntil | string (ISO)   | No (omit = permanent) |

**Response**: 204

---

### POST /conversations/:id/archive

Archive conversation.

**Response**: 204

---

### DELETE /conversations/:id/archive

Unarchive conversation.

**Response**: 204

---

### POST /conversations/users/:userId/block

Block a user.

**Response**: 204

---

### DELETE /conversations/users/:userId/block

Unblock a user.

**Response**: 204

---

### POST /conversations/users/:userId/report

Report a user.

**Body**:

| Field     | Type                | Required      |
| --------- | ------------------- | ------------- |
| messageId | string (UUID)       | No            |
| category  | ReportCategory enum | Yes           |
| details   | string              | No (max 1024) |

**Response**: 204

---

## Messages

**All message endpoints require authentication.**

### GET /conversations/:conversationId/messages

Paginated messages. Loaded in reverse (newest first).

**Query**:

| Param  | Type          | Default |
| ------ | ------------- | ------- |
| before | string (UUID) | —       |
| after  | string (UUID) | —       |
| limit  | number        | 50      |

**Response** (200):

```json
{
  "data": [MessageView],
  "hasMore": true,
  "nextCursor": "uuid|null"
}
```

---

### GET /conversations/:conversationId/messages/search

Search messages in conversation.

**Query**:

| Param | Type             | Default |
| ----- | ---------------- | ------- |
| q     | string (max 256) | —       |
| limit | number           | 30      |

**Response** (200): `MessageView[]`

---

### POST /conversations/:conversationId/messages

Send a message.

**Body**:

| Field           | Type             | Required          |
| --------------- | ---------------- | ----------------- |
| conversationId  | string (UUID)    | Yes               |
| text            | string           | No (max 4096)     |
| messageType     | MessageType enum | No (default TEXT) |
| replyToId       | string (UUID)    | No                |
| forwardedFromId | string (UUID)    | No                |
| attachments     | AttachmentDto[]  | No                |

**Response** (201): `MessageView`

---

### PATCH /conversations/:conversationId/messages/:messageId

**Sender only**. Edit message.

**Body**:

| Field     | Type          | Required       |
| --------- | ------------- | -------------- |
| messageId | string (UUID) | Yes            |
| body      | string        | Yes (max 4096) |

**Response** (200): Updated `MessageView`

---

### DELETE /conversations/:conversationId/messages/:messageId

Delete message.

**Body**:

| Field     | Type          | Required |
| --------- | ------------- | -------- |
| messageId | string (UUID) | Yes      |
| forAll    | boolean       | No       |

**Response** (200):

```json
{
  "messageId": "uuid",
  "deletedForAll": true
}
```

---

### POST /conversations/:conversationId/messages/:messageId/forward

Forward message to other conversations.

**Body**:

| Field           | Type             | Required |
| --------------- | ---------------- | -------- |
| messageId       | string (UUID)    | Yes      |
| conversationIds | string[] (UUIDs) | Yes      |

**Response** (201): `MessageView[]`

---

### POST /conversations/:conversationId/messages/:messageId/reactions

Add reaction.

**Body**:

| Field     | Type          | Required    |
| --------- | ------------- | ----------- |
| messageId | string (UUID) | Yes         |
| emoji     | string        | Yes (max 8) |

**Response** (201): Updated `MessageView`

---

### DELETE /conversations/:conversationId/messages/:messageId/reactions/:emoji

Remove reaction.

**Response** (200): Updated `MessageView`

---

### POST /conversations/:conversationId/messages/read

Mark all messages as read.

**Response**: 204

---

### POST /conversations/:conversationId/messages/:messageId/pin

Pin a message.

**Response**: 204

---

### DELETE /conversations/:conversationId/messages/:messageId/pin

Unpin a message.

**Response**: 204

---

## Swagger Documentation

Interactive API docs are available at `/api/docs` in production.

Swagger is configured with Bearer auth support for testing endpoints directly.
