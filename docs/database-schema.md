# Database Schema

## Overview

The database uses **PostgreSQL** with **Prisma 5** as the ORM. The schema supports:

- User accounts with profiles
- Social graph (follows)
- Content (posts, likes, comments)
- Real-time messaging (conversations, messages, reactions)
- Moderation (blocks, reports)

---

## Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────<│   Follow    │>────│    User     │
│             │     └─────────────┘     │  (self-ref) │
│             │                         └─────────────┘
│             │     ┌─────────────┐
│             │────<│    Post     │
│             │     │             │<────┌─────────────┐
│             │     │             │     │    Like     │
│             │     │             │>────└─────────────┘
│             │     │             │
│             │     │             │>────┌─────────────┐
│             │     └─────────────┘     │   Comment   │
│             │                         └─────────────┘
│             │
│             │     ┌─────────────────┐
│             │────<│   Conversation   │
│             │     │                  │
│             │     │                  │>──┌──────────────────────┐
│             │     │                  │   │ ConversationParticipant│
│             │     │                  │   └──────────────────────┘
│             │     │                  │
│             │     │                  │>──┌─────────────┐
│             │     └─────────────────┘   │   Message   │
│             │                           │             │
│             │                           │             │>──┌──────────────────┐
│             │                           │             │   │MessageAttachment │
│             │                           │             │   └──────────────────┘
│             │                           │             │
│             │                           │             │>──┌────────────────┐
│             │                           │             │   │MessageReaction │
│             │                           │             │   └────────────────┘
│             │                           │             │
│             │                           │             │>──┌───────────────┐
│             │                           └─────────────┘   │MessageDeletion│
│             │                                             └───────────────┘
│             │
│             │     ┌─────────────┐
│             │────<│  UserBlock  │
│             │     └─────────────┘
│             │
│             │     ┌─────────────┐
│             │────<│   Report    │
│             │     └─────────────┘
│             │
│             │     ┌─────────────┐
│             │────<│PinnedMessage│
└─────────────┘     └─────────────┘
```

---

## Models

### User

Core user account with authentication and profile data.

| Field        | Type     | Attributes             | Description              |
| ------------ | -------- | ---------------------- | ------------------------ |
| id           | String   | `@id @default(uuid())` | Primary key              |
| email        | String   | `@unique`              | User email (unique)      |
| username     | String   | `@unique`              | Username (unique)        |
| displayName  | String?  |                        | Display name             |
| passwordHash | String   |                        | Argon2 hashed password   |
| avatar       | String?  |                        | Avatar URL               |
| bio          | String?  |                        | User bio (max 300 chars) |
| createdAt    | DateTime | `@default(now())`      | Account creation time    |
| updatedAt    | DateTime | `@updatedAt`           | Last update time         |

**Relations**:

- `posts` → Post[]
- `followers` → Follow[] (as `following`)
- `following` → Follow[] (as `follower`)
- `comments` → Comment[]
- `conversationParticipants` → ConversationParticipant[]
- `sentMessages` → Message[] (as `SentMessages`)
- `messageReactions` → MessageReaction[]
- `blockedUsers` → UserBlock[] (as `Blocker`)
- `blockedByUsers` → UserBlock[] (as `Blocked`)
- `reportsFiled` → Report[] (as `Reporter`)
- `reportsReceived` → Report[] (as `Reported`)
- `deletedMessages` → MessageDeletion[]

---

### Post

User-generated content (text + optional image).

| Field     | Type     | Attributes             | Description       |
| --------- | -------- | ---------------------- | ----------------- |
| id        | String   | `@id @default(uuid())` | Primary key       |
| content   | String   |                        | Post text content |
| image     | String?  |                        | Image URL         |
| createdAt | DateTime | `@default(now())`      | Creation time     |
| updatedAt | DateTime | `@updatedAt`           | Last update time  |
| authorId  | String   |                        | Author user ID    |

**Relations**:

- `author` → User
- `likes` → Like[]
- `comments` → Comment[]

---

### Like

Post like (unique per user-post pair).

| Field     | Type     | Attributes             | Description    |
| --------- | -------- | ---------------------- | -------------- |
| id        | String   | `@id @default(cuid())` | Primary key    |
| postId    | String   |                        | Liked post ID  |
| userId    | String   |                        | User who liked |
| createdAt | DateTime | `@default(now())`      | Like time      |

**Constraints**: `@@unique([postId, userId])`

**Relations**:

- `post` → Post (onDelete: Cascade)

---

### Follow

Follow relationship between users.

| Field       | Type     | Attributes             | Description      |
| ----------- | -------- | ---------------------- | ---------------- |
| id          | String   | `@id @default(cuid())` | Primary key      |
| followerId  | String   |                        | Follower user ID |
| followingId | String   |                        | Followed user ID |
| createdAt   | DateTime | `@default(now())`      | Follow time      |

**Constraints**: `@@unique([followerId, followingId])`

**Relations**:

- `follower` → User (as `follower`)
- `following` → User (as `following`)

---

### Comment

Post comment.

| Field     | Type     | Attributes             | Description                 |
| --------- | -------- | ---------------------- | --------------------------- |
| id        | String   | `@id @default(cuid())` | Primary key                 |
| text      | String   |                        | Comment text (1-1000 chars) |
| postId    | String   |                        | Parent post ID              |
| userId    | String   |                        | Author user ID              |
| createdAt | DateTime | `@default(now())`      | Comment time                |

**Relations**:

- `post` → Post (onDelete: Cascade)
- `user` → User (onDelete: Cascade)

---

### Conversation

Chat conversation (direct or group).

| Field       | Type             | Attributes             | Description       |
| ----------- | ---------------- | ---------------------- | ----------------- |
| id          | String           | `@id @default(uuid())` | Primary key       |
| type        | ConversationType | `@default(DIRECT)`     | DIRECT or GROUP   |
| name        | String?          |                        | Group name        |
| avatar      | String?          |                        | Group avatar URL  |
| description | String?          |                        | Group description |
| createdById | String?          |                        | Creator user ID   |
| createdAt   | DateTime         | `@default(now())`      | Creation time     |
| updatedAt   | DateTime         | `@updatedAt`           | Last update time  |

**Indexes**: `@@index([createdAt])`

**Relations**:

- `participants` → ConversationParticipant[]
- `messages` → Message[]
- `pinnedMessages` → PinnedMessage[]

---

### ConversationParticipant

User membership in a conversation.

| Field          | Type            | Attributes             | Description         |
| -------------- | --------------- | ---------------------- | ------------------- |
| id             | String          | `@id @default(uuid())` | Primary key         |
| conversationId | String          |                        | Conversation ID     |
| userId         | String          |                        | User ID             |
| nickname       | String?         |                        | Custom nickname     |
| role           | ParticipantRole | `@default(MEMBER)`     | MEMBER/ADMIN/OWNER  |
| theme          | String?         | `@default("default")`  | Per-user theme      |
| muteLevel      | MuteLevel       | `@default(NONE)`       | Mute setting        |
| mutedUntil     | DateTime?       |                        | Mute expiration     |
| leftAt         | DateTime?       |                        | Leave time          |
| archivedAt     | DateTime?       |                        | Archive time        |
| lastReadAt     | DateTime        | `@default(now())`      | Last read timestamp |
| joinedAt       | DateTime        | `@default(now())`      | Join time           |
| updatedAt      | DateTime        | `@updatedAt`           | Last update time    |

**Constraints**: `@@unique([conversationId, userId])`

**Indexes**: `@@index([userId])`, `@@index([conversationId])`

**Relations**:

- `conversation` → Conversation (onDelete: Cascade)
- `user` → User (onDelete: Cascade)

---

### Message

Chat message.

| Field           | Type        | Attributes             | Description          |
| --------------- | ----------- | ---------------------- | -------------------- |
| id              | String      | `@id @default(uuid())` | Primary key          |
| conversationId  | String      |                        | Conversation ID      |
| senderId        | String      |                        | Sender user ID       |
| body            | String?     |                        | Message text         |
| messageType     | MessageType | `@default(TEXT)`       | Message type         |
| replyToId       | String?     |                        | Replied message ID   |
| forwardedFromId | String?     |                        | Forwarded message ID |
| deletedAt       | DateTime?   |                        | Deletion time        |
| deletedForAll   | Boolean     | `@default(false)`      | Deleted for all      |
| editedAt        | DateTime?   |                        | Edit time            |
| createdAt       | DateTime    | `@default(now())`      | Creation time        |

**Indexes**: `@@index([conversationId, createdAt])`, `@@index([senderId])`

**Relations**:

- `conversation` → Conversation (onDelete: Cascade)
- `sender` → User (onDelete: Cascade)
- `replyTo` → Message (self-relation, as `Replies`)
- `forwardedFrom` → Message (self-relation, as `Forwards`)
- `attachments` → MessageAttachment[]
- `reactions` → MessageReaction[]
- `deletedFor` → MessageDeletion[]
- `pinnedIn` → PinnedMessage[]

---

### MessageAttachment

File/media attachment to a message.

| Field        | Type           | Attributes             | Description          |
| ------------ | -------------- | ---------------------- | -------------------- |
| id           | String         | `@id @default(uuid())` | Primary key          |
| messageId    | String         |                        | Parent message ID    |
| type         | AttachmentType |                        | Attachment type      |
| url          | String         |                        | File URL             |
| fileName     | String?        |                        | Original filename    |
| mimeType     | String?        |                        | MIME type            |
| size         | Int?           |                        | File size in bytes   |
| width        | Int?           |                        | Image/video width    |
| height       | Int?           |                        | Image/video height   |
| duration     | Int?           |                        | Audio/video duration |
| thumbnailUrl | String?        |                        | Thumbnail URL        |
| createdAt    | DateTime       | `@default(now())`      | Creation time        |

**Indexes**: `@@index([messageId])`

**Relations**:

- `message` → Message (onDelete: Cascade)

---

### MessageReaction

Emoji reaction to a message.

| Field     | Type     | Attributes             | Description      |
| --------- | -------- | ---------------------- | ---------------- |
| id        | String   | `@id @default(uuid())` | Primary key      |
| messageId | String   |                        | Message ID       |
| userId    | String   |                        | Reacting user ID |
| emoji     | String   |                        | Emoji character  |
| createdAt | DateTime | `@default(now())`      | Reaction time    |

**Constraints**: `@@unique([messageId, userId, emoji])`

**Indexes**: `@@index([messageId])`

**Relations**:

- `message` → Message (onDelete: Cascade)
- `user` → User (onDelete: Cascade)

---

### PinnedMessage

Pinned message in a conversation.

| Field          | Type     | Attributes             | Description       |
| -------------- | -------- | ---------------------- | ----------------- |
| id             | String   | `@id @default(uuid())` | Primary key       |
| conversationId | String   |                        | Conversation ID   |
| messageId      | String   |                        | Pinned message ID |
| pinnedByUserId | String   |                        | User who pinned   |
| pinnedAt       | DateTime | `@default(now())`      | Pin time          |

**Constraints**: `@@unique([conversationId, messageId])`

**Indexes**: `@@index([conversationId])`

**Relations**:

- `conversation` → Conversation (onDelete: Cascade)
- `message` → Message (onDelete: Cascade)

---

### MessageDeletion

Per-user message soft delete.

| Field     | Type     | Attributes            | Description   |
| --------- | -------- | --------------------- | ------------- |
| messageId | String   | `@@id` (composite PK) | Message ID    |
| userId    | String   | `@@id` (composite PK) | User ID       |
| deletedAt | DateTime | `@default(now())`     | Deletion time |

**Relations**:

- `message` → Message (onDelete: Cascade)
- `user` → User (onDelete: Cascade)

---

### UserBlock

User block relationship.

| Field     | Type     | Attributes            | Description     |
| --------- | -------- | --------------------- | --------------- |
| blockerId | String   | `@@id` (composite PK) | Blocker user ID |
| blockedId | String   | `@@id` (composite PK) | Blocked user ID |
| createdAt | DateTime | `@default(now())`     | Block time      |

**Relations**:

- `blocker` → User (onDelete: Cascade)
- `blocked` → User (onDelete: Cascade)

---

### Report

User report for moderation.

| Field      | Type           | Attributes             | Description        |
| ---------- | -------------- | ---------------------- | ------------------ |
| id         | String         | `@id @default(uuid())` | Primary key        |
| reporterId | String         |                        | Reporter user ID   |
| reportedId | String         |                        | Reported user ID   |
| messageId  | String?        |                        | Related message ID |
| category   | ReportCategory |                        | Report category    |
| details    | String?        |                        | Additional details |
| status     | ReportStatus   | `@default(PENDING)`    | Report status      |
| createdAt  | DateTime       | `@default(now())`      | Creation time      |
| updatedAt  | DateTime       | `@updatedAt`           | Last update time   |

**Indexes**: `@@index([reportedId])`, `@@index([status])`

**Relations**:

- `reporter` → User (onDelete: Cascade)
- `reported` → User (onDelete: Cascade)

---

## Enums

### ConversationType

```
DIRECT  — One-on-one conversation
GROUP   — Group conversation
```

### ParticipantRole

```
MEMBER  — Regular participant
ADMIN   — Can manage members
OWNER   — Full control, can transfer ownership
```

### MuteLevel

```
NONE               — Not muted
MESSAGES           — Messages muted
CALLS              — Calls muted
MESSAGES_AND_CALLS — Everything muted
```

### MessageType

```
TEXT      — Text message
IMAGE     — Image message
VIDEO     — Video message
AUDIO     — Audio/voice message
FILE      — File attachment
GIF       — GIF
STICKER   — Sticker
LOCATION  — Location share
CALL_LOG  — Call history entry
SYSTEM    — System message
DELETED   — Deleted message placeholder
```

### AttachmentType

```
IMAGE  — Image file
VIDEO  — Video file
AUDIO  — Audio file
FILE   — Generic file
LINK   — URL link
GIF    — GIF animation
```

### ReportCategory

```
SPAM                    — Spam
SUICIDE_SELF_HARM       — Suicide or self-harm
IMPERSONATION           — Impersonation
VIOLENCE_DANGEROUS_ORGS — Violence or dangerous organizations
NUDITY_SEXUAL           — Nudity or sexual content
RESTRICTED_GOODS        — Restricted goods
FRAUD                   — Fraud or scam
OTHER                   — Other
```

### ReportStatus

```
PENDING     — Awaiting review
REVIEWED    — Reviewed
DISMISSED   — Dismissed
ACTION_TAKEN — Action taken
```

---

## Migrations

Migrations are stored in `backend/prisma/migrations/` and managed via Prisma CLI:

```bash
# Create a new migration
pnpm --filter backend db:migrate

# Apply migrations (production)
pnpm --filter backend exec prisma migrate deploy

# Reset database (development)
pnpm --filter backend exec prisma migrate reset

# Open Prisma Studio (GUI)
pnpm --filter backend db:studio
```

---

## Indexes

Key indexes for query performance:

| Model                   | Index                         | Purpose                        |
| ----------------------- | ----------------------------- | ------------------------------ |
| Conversation            | `[createdAt]`                 | Sort conversations by activity |
| ConversationParticipant | `[userId]`                    | Find user's conversations      |
| ConversationParticipant | `[conversationId]`            | Find conversation members      |
| Message                 | `[conversationId, createdAt]` | Paginate messages              |
| Message                 | `[senderId]`                  | Find user's messages           |
| MessageAttachment       | `[messageId]`                 | Load message attachments       |
| MessageReaction         | `[messageId]`                 | Load message reactions         |
| PinnedMessage           | `[conversationId]`            | Load pinned messages           |
| Report                  | `[reportedId]`                | Find reports against user      |
| Report                  | `[status]`                    | Filter by status               |
