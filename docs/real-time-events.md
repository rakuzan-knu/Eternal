# Real-time Events (Socket.IO)

## Connection

**Namespace**: `/messenger`

### Authentication

Connection requires a valid JWT access token. Provide it via:

1. **Header** (preferred): `Authorization: Bearer <token>`
2. **Auth payload**: `{ token: "<token>" }`

If authentication fails, the connection is immediately disconnected.

### Presence

The server tracks user presence via an in-memory Map. When a user's last socket disconnects, a `userOffline` event is broadcast to all clients.

---

## Client → Server Events

### joinConversation

Join a conversation room to receive real-time events.

**Payload**:

```typescript
{
  conversationId: string; // UUID
}
```

**Requirements**: Must be a participant in the conversation.

---

### leaveConversation

Leave a conversation room.

**Payload**:

```typescript
{
  conversationId: string; // UUID
}
```

---

### typingStart

Notify room that user is typing.

**Payload**:

```typescript
{
  conversationId: string; // UUID
}
```

**Broadcasts**: `typing` event to room (excluding sender)

---

### typingStop

Notify room that user stopped typing.

**Payload**:

```typescript
{
  conversationId: string; // UUID
}
```

**Broadcasts**: `typing` event to room (excluding sender)

---

### markRead

Mark messages as read.

**Payload**:

```typescript
{
  conversationId: string,  // UUID
  messageId?: string       // UUID, optional
}
```

**Broadcasts**: `messageRead` event to room (only if state changed)

---

### sendMessage

Send a message to a conversation. Rate limited to **20 messages per 10 seconds**.

**Payload**:

```typescript
{
  conversationId: string,       // UUID
  text?: string,                // Max 4096 chars
  messageType?: MessageType,    // Default: TEXT
  replyToId?: string,           // UUID
  forwardedFromId?: string,     // UUID
  attachments?: AttachmentDto[]
}
```

**Ack**:

```typescript
{
  status: 'ok',
  message: MessageView
}
```

**On rate limit exceeded**:

```typescript
{
  status: 'error',
  error: 'Too many messages, slow down'
}
```

**Broadcasts**: `newMessage` event to room

---

### editMessage

Edit an existing message. Sender only.

**Payload**:

```typescript
{
  messageId: string,  // UUID
  body: string        // Max 4096 chars
}
```

**Ack**:

```typescript
{
  status: 'ok',
  message: MessageView
}
```

**Broadcasts**: `messageEdited` event to room

---

### deleteMessage

Delete a message.

**Payload**:

```typescript
{
  messageId: string,  // UUID
  forAll?: boolean
}
```

**Ack**:

```typescript
{
  status: 'ok',
  deletedForAll: boolean
}
```

**Broadcasts**: `messageDeleted` event to room

---

### forwardMessage

Forward a message to other conversations.

**Payload**:

```typescript
{
  messageId: string,          // UUID
  conversationIds: string[]   // UUIDs
}
```

**Ack**:

```typescript
{
  status: 'ok',
  messages: MessageView[]
}
```

**Broadcasts**: `newMessage` event to each target room

---

### addReaction

Add emoji reaction to a message.

**Payload**:

```typescript
{
  messageId: string,  // UUID
  emoji: string       // Max 8 chars
}
```

**Ack**:

```typescript
{
  status: 'ok',
  message: MessageView
}
```

**Broadcasts**: `messageReactionAdded` event to room

---

### removeReaction

Remove emoji reaction from a message.

**Payload**:

```typescript
{
  messageId: string,  // UUID
  emoji: string       // Max 8 chars
}
```

**Ack**:

```typescript
{
  status: 'ok',
  message: MessageView
}
```

**Broadcasts**: `messageReactionRemoved` event to room

---

### pinMessage

Pin a message in conversation.

**Payload**:

```typescript
{
  conversationId: string,  // UUID
  messageId: string        // UUID
}
```

**Ack**:

```typescript
{
  status: 'ok';
}
```

**Broadcasts**: `messagePinned` event to room

---

### unpinMessage

Unpin a message in conversation.

**Payload**:

```typescript
{
  conversationId: string,  // UUID
  messageId: string        // UUID
}
```

**Ack**:

```typescript
{
  status: 'ok';
}
```

**Broadcasts**: `messageUnpinned` event to room

---

## Server → Client Events

### typing

A user started or stopped typing.

**Payload**:

```typescript
{
  conversationId: string,
  userId: string,
  isTyping: boolean
}
```

---

### messageRead

Messages were read by a user.

**Payload**:

```typescript
{
  conversationId: string,
  userId: string,
  messageId: string | null,
  readAt: string  // ISO datetime
}
```

---

### newMessage

A new message was sent.

**Payload**:

```typescript
{
  conversationId: string,
  message: MessageView
}
```

---

### messageEdited

A message was edited.

**Payload**:

```typescript
{
  conversationId: string,
  message: MessageView
}
```

---

### messageDeleted

A message was deleted.

**Payload**:

```typescript
{
  conversationId: string,
  messageId: string,
  deletedForAll: boolean
}
```

---

### messageReactionAdded

A reaction was added to a message.

**Payload**:

```typescript
{
  conversationId: string,
  message: MessageView
}
```

---

### messageReactionRemoved

A reaction was removed from a message.

**Payload**:

```typescript
{
  conversationId: string,
  message: MessageView
}
```

---

### messagePinned

A message was pinned.

**Payload**:

```typescript
{
  conversationId: string,
  messageId: string
}
```

---

### messageUnpinned

A message was unpinned.

**Payload**:

```typescript
{
  conversationId: string,
  messageId: string
}
```

---

### userOffline

A user went offline (last socket disconnected).

**Payload**:

```typescript
{
  userId: string;
}
```

**Target**: All connected clients

---

### rateLimitExceeded

Send rate limit was exceeded.

**Payload**:

```typescript
{
  message: string; // e.g., "Too many messages, slow down"
}
```

**Target**: Offending socket only

---

## Type Definitions

```typescript
interface UserSnapshot {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

interface AttachmentView {
  id: string;
  type: AttachmentType;
  url: string;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailUrl: string | null;
}

interface ReactionSummary {
  emoji: string;
  count: number;
  selfReacted: boolean;
  users: UserSnapshot[];
}

interface MessageView {
  id: string;
  conversationId: string;
  sender: UserSnapshot;
  body: string | null;
  messageType: MessageType;
  replyTo: MessageView | null;
  forwardedFrom: Pick<MessageView, 'id' | 'body' | 'sender'> | null;
  attachments: AttachmentView[];
  reactions: ReactionSummary[];
  readBy: string[];
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: Date;
  editedAt: Date | null;
}

interface ParticipantView {
  userId: string;
  user: UserSnapshot;
  nickname: string | null;
  role: ParticipantRole;
  theme: string;
  muteLevel: MuteLevel;
  mutedUntil: Date | null;
  joinedAt: Date;
}

interface ConversationView {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar: string | null;
  description: string | null;
  createdById: string;
  participants: ParticipantView[];
  lastMessage: MessageView | null;
  unreadCount: number;
  myTheme: string;
  myMuteLevel: MuteLevel;
  myNickname: string | null;
  isArchived: boolean;
  pinnedMessages: MessageView[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Enums

```typescript
enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

enum ParticipantRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

enum MuteLevel {
  NONE = 'NONE',
  MESSAGES = 'MESSAGES',
  CALLS = 'CALLS',
  MESSAGES_AND_CALLS = 'MESSAGES_AND_CALLS',
}

enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  GIF = 'GIF',
  STICKER = 'STICKER',
  LOCATION = 'LOCATION',
  CALL_LOG = 'CALL_LOG',
  SYSTEM = 'SYSTEM',
  DELETED = 'DELETED',
}

enum AttachmentType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  LINK = 'LINK',
  GIF = 'GIF',
}
```
