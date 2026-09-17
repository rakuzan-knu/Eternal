# ⚡ WebSocket Event Protocol Specification

The real-time messaging gateway is built on **Socket.IO 4** running on the `/messenger` namespace. It powers instant messaging, live presence, typing indicators, reactions, read receipts, and real-time notifications.

---

## 🌐 Connection & Authentication

### 1. Connection URL & Transport

```typescript
import { io } from 'socket.io-client';

const socket = io('https://api.socialnetwork.dev/messenger', {
  auth: {
    token: accessToken, // Bearer access token
  },
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
```

### 2. Handshake Lifecycle

1. **Client connects** providing `auth.token`.
2. **Server validates token** via `WsJwtGuard`. If invalid or expired, the server emits an error and closes the socket.
3. **Upon success**, the server emits `gatewayReady`:
   ```json
   {
     "status": "connected",
     "userId": "uuid",
     "serverTime": "2026-09-04T18:00:00.000Z"
   }
   ```
4. Sockets are automatically bound to user personal room `user:<userId>`.

---

## 🚪 Room Subscription Model

| Room Target                     | Description                                             | How to Join                                     |
| :------------------------------ | :------------------------------------------------------ | :---------------------------------------------- |
| `user:<userId>`                 | Personal notification & direct action feed              | Automatically joined on authenticated handshake |
| `conversation:<conversationId>` | Active chatroom for messages, typing, and read receipts | Joined via `joinConversation` event             |

---

## 📤 Client-to-Server Events (Emitted by Client)

### 1. Conversation Navigation

#### `joinConversation`

Subscribes the socket to conversation updates.

```typescript
socket.emit('joinConversation', { conversationId: 'uuid' }, (response) => {
  // response: { success: true, conversationId: 'uuid' }
});
```

#### `leaveConversation`

Unsubscribes the socket from conversation updates.

```typescript
socket.emit('leaveConversation', { conversationId: 'uuid' });
```

---

### 2. Messaging Operations

#### `sendMessage`

Send a new text, encrypted envelope, or media message.

```typescript
socket.emit(
  'sendMessage',
  {
    conversationId: 'uuid',
    content: 'Hello world!',
    mediaIds: ['uuid-media-1'],
    replyToId: 'uuid-parent-message',
    clientMessageId: 'optimistic-client-id-123',
  },
  (ack) => {
    // ack returns the created Message object or error
  },
);
```

#### `editMessage`

Edit an existing message authored by the authenticated user.

```typescript
socket.emit('editMessage', {
  messageId: 'uuid',
  content: 'Updated text content',
});
```

#### `deleteMessage`

Delete a message (soft-delete).

```typescript
socket.emit('deleteMessage', {
  messageId: 'uuid',
  mode: 'forEveryone', // or 'forMe'
});
```

#### `forwardMessage`

Forward a message to another conversation.

```typescript
socket.emit('forwardMessage', {
  messageId: 'uuid',
  targetConversationId: 'uuid',
});
```

---

### 3. Interactive Features & Receipts

#### `addReaction` / `removeReaction`

React to a message with an emoji.

```typescript
socket.emit('addReaction', {
  messageId: 'uuid',
  emoji: '❤️',
});

socket.emit('removeReaction', {
  messageId: 'uuid',
  emoji: '❤️',
});
```

#### `pinMessage` / `unpinMessage`

Pin/unpin a key message in a conversation.

```typescript
socket.emit('pinMessage', { messageId: 'uuid', conversationId: 'uuid' });
socket.emit('unpinMessage', { messageId: 'uuid', conversationId: 'uuid' });
```

#### `typingStart` / `typingStop`

Broadcast ephemeral typing indicator.

```typescript
socket.emit('typingStart', { conversationId: 'uuid' });
socket.emit('typingStop', { conversationId: 'uuid' });
```

#### `markRead`

Mark all messages up to a specific ID as read.

```typescript
socket.emit('markRead', {
  conversationId: 'uuid',
  messageId: 'uuid',
});
```

---

### 4. Connection State & Resumption

#### `gatewayResume`

Restore missed events following a temporary disconnection.

```typescript
socket.emit('gatewayResume', {
  lastEventId: 'evt_12345',
  activeConversationIds: ['uuid-1', 'uuid-2'],
});
```

#### `clientHibernate` / `clientWake`

Signal mobile or background tab power-saving state.

```typescript
socket.emit('clientHibernate');
socket.emit('clientWake');
```

---

### 5. 🎙️ P2P WebRTC Voice Mesh Signalling

Coordinates browser-to-browser WebRTC full-mesh voice rooms ($0 server media bandwidth).

#### `voice:mesh-join`

Join a voice channel room. Returns current active peer IDs.

```typescript
socket.emit('voice:mesh-join', { roomId: 'uuid' }, (response) => {
  // response: { success: boolean, peers: Array<{ peerId: string, userId: string }> }
});
```

#### `voice:mesh-leave`

Leave an active voice room and close peer connections.

```typescript
socket.emit('voice:mesh-leave', { roomId: 'uuid' });
```

#### `voice:mesh-signal`

Relay SDP Offer/Answer or ICE Candidate directly to target peer.

```typescript
socket.emit('voice:mesh-signal', {
  roomId: 'uuid',
  targetPeerId: 'uuid',
  signal: {
    type: 'offer' | 'answer' | 'candidate',
    candidate?: RTCIceCandidateInit,
    sdp?: RTCSessionDescriptionInit,
  },
});
```

---

## 📥 Server-to-Client Events (Broadcasted to Client)

| Event Name                   | Scope               | Payload Description                                |
| :--------------------------- | :------------------ | :------------------------------------------------- |
| `newMessage`                 | `conversation:<id>` | Created message object with author and attachments |
| `messageEdited`              | `conversation:<id>` | Updated message ID, new content, and `editedAt`    |
| `messageDeleted`             | `conversation:<id>` | Deleted message ID and deletion scope              |
| `messageDelivered`           | `user:<senderId>`   | Delivery timestamp confirmation                    |
| `messageRead`                | `conversation:<id>` | Participant ID, conversation ID, and `readAt`      |
| `typing`                     | `conversation:<id>` | `{ userId, conversationId, isTyping: boolean }`    |
| `messageReactionAdded`       | `conversation:<id>` | `{ messageId, userId, emoji }`                     |
| `messageReactionRemoved`     | `conversation:<id>` | `{ messageId, userId, emoji }`                     |
| `messagePinned`              | `conversation:<id>` | Pinned message metadata                            |
| `userOnline` / `userOffline` | Global / Followers  | Live presence state updates                        |
| `presence:batch`             | Client on join      | Batch status map `{ [userId]: boolean }`           |
| `voice:mesh-peer-joined`     | `voice:<roomId>`    | `{ peerId: string, userId: string }`               |
| `voice:mesh-peer-left`       | `voice:<roomId>`    | `{ peerId: string, userId: string }`               |
| `voice:mesh-signal`          | Calling client      | `{ fromPeerId: string, signal: any }`              |
| `socialNotification`         | `user:<userId>`     | New like, follow, mention, or repost notification  |
| `rateLimitExceeded`          | Calling client      | Error with retry-after cooldown period             |

---

## 🛡️ Error Handling & Backpressure

1. **Validation Rejection**: Payload validation is enforced via `WsValidationFilter` and Zod schemas. Invalid payloads emit an error object and trigger the callback with status `400`.
2. **Rate Limiting**: Socket event rate limiting is managed per-user via Redis token buckets. Exceeding thresholds emits `rateLimitExceeded`.
3. **Resync Signal (`resyncRequired`)**: If the server determines that state drift occurred during disconnection, it emits `resyncRequired`, prompting the client to reload state via the REST API.
