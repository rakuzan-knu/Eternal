/**
 * V8 Shape-Stable Factory Functions
 *
 * V8's JIT compiler assigns a "Hidden Class" (HiddenClass / Map) to every JS
 * object based on: (a) which keys it has, and (b) the order in which those
 * keys were added. If a hot function receives objects with different hidden
 * classes (e.g. because some calls include optional fields and others don't),
 * V8 generates MEGAMORPHIC (unoptimized) code for that call site.
 *
 * Fix: always create objects with ALL keys in the SAME order, using `undefined`
 * for missing optional values instead of omitting the key.
 * This produces a single, stable hidden class → V8 compiles to native machine
 * code with no runtime type checks.
 *
 * Rules:
 *  1. All factory functions return plain-object literals (not class instances)
 *  2. Every call to a factory includes ALL keys in declaration order
 *  3. Optional fields use `null` / `undefined` — never omit the key
 *  4. Never mutate the returned object — V8 tracks hidden-class transitions
 */

// ─── JWT Payload ─────────────────────────────────────────────────────────────

/**
 * Shape-stable JWT access token payload.
 * Keys: type, sub, email, username, jti — always in this order.
 */
export interface JwtAccessShape {
  readonly type: 'access';
  readonly sub: string;
  readonly email: string;
  readonly username: string;
  readonly jti: string;
}

/**
 * Shape-stable JWT refresh token payload.
 * Keys: type, sub, jti — always in this order.
 */
export interface JwtRefreshShape {
  readonly type: 'refresh';
  readonly sub: string;
  readonly jti: string;
}

/**
 * Creates a shape-stable JWT access payload.
 * Always produces an object with 5 keys in identical insertion order.
 * V8 compiles all call sites to the same optimized machine-code path.
 */
export function makeJwtAccessPayload(
  sub: string,
  email: string,
  username: string,
  jti: string,
): JwtAccessShape {
  // Explicit object literal with fixed key order — do NOT use spread or shorthand
  return { type: 'access', sub, email, username, jti };
}

/**
 * Creates a shape-stable JWT refresh payload.
 */
export function makeJwtRefreshPayload(sub: string, jti: string): JwtRefreshShape {
  return { type: 'refresh', sub, jti };
}

// ─── Smi (Small Integer) Utility ─────────────────────────────────────────────

/**
 * Coerces an arbitrary numeric value to a signed 32-bit integer (Smi in V8).
 * Keeping counters and IDs in Smi range prevents heap allocation of HeapNumber objects.
 */
export function toSmi(value: number | string | null | undefined): number {
  return (Number(value) || 0) | 0;
}

// ─── WebSocket Event Wrapper ──────────────────────────────────────────────────

/**
 * Shape-stable gateway event wrapper (used in emitToUser / broadcast paths).
 * Keys: seq, event, payload, timestamp — always in this order.
 *
 * The object pool (GatewayWrapperPool) reuses these objects, but their shape
 * must remain stable for pool-reuse to benefit from V8 hidden-class caching.
 */
export interface WsEventShape {
  seq: number;
  event: string;
  payload: unknown;
  timestamp: number;
}

export function makeWsEvent(
  seq: number,
  event: string,
  payload: unknown,
  timestamp: number,
): WsEventShape {
  return { seq: seq | 0, event, payload, timestamp };
}

// ─── User Basic (notification/WS actor) ──────────────────────────────────────

/**
 * Shape-stable minimal user reference used in social notifications / WS events.
 * Keys: id, username, displayName, avatar — always in this order.
 * Optional fields use null instead of omission.
 */
export interface UserBasicShape {
  readonly id: string;
  readonly username: string;
  readonly displayName: string | null;
  readonly avatar: string | null;
}

export function makeUserBasic(
  id: string,
  username: string,
  displayName: string | null | undefined,
  avatar: string | null | undefined,
): UserBasicShape {
  // Normalise undefined → null to keep shape stable across all call sites
  return {
    id,
    username,
    displayName: displayName ?? null,
    avatar: avatar ?? null,
  };
}

// ─── Social Notification (WS emit payload) ────────────────────────────────────

/**
 * Shape-stable social notification payload emitted over WebSocket.
 * Keys: type, actor, postId, authorUsername, message — always in this order.
 */
export interface SocialNotificationShape {
  readonly type: string;
  readonly actor: UserBasicShape;
  readonly postId: string;
  readonly authorUsername: string;
  readonly message: string;
}

export function makeSocialNotification(
  type: string,
  actor: UserBasicShape,
  postId: string,
  authorUsername: string,
  message: string,
): SocialNotificationShape {
  return { type, actor, postId, authorUsername, message };
}

// ─── Typing Event ─────────────────────────────────────────────────────────────

/**
 * Shape-stable typing indicator payload.
 * Keys: conversationId, userId, isTyping — always in this order.
 */
export interface TypingShape {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export function makeTypingEvent(
  conversationId: string,
  userId: string,
  isTyping: boolean,
): TypingShape {
  return { conversationId, userId, isTyping };
}

// ─── Read Receipt ─────────────────────────────────────────────────────────────

/**
 * Shape-stable read-receipt payload.
 * Keys: conversationId, userId, messageId, readAt — always in this order.
 */
export interface ReadReceiptShape {
  conversationId: string;
  userId: string;
  messageId: string | null;
  readAt: string;
}

export function makeReadReceipt(
  conversationId: string,
  userId: string,
  messageId: string | null,
  readAt: string,
): ReadReceiptShape {
  return { conversationId, userId, messageId, readAt };
}

// ─── Chat Reaction Summary ───────────────────────────────────────────────────

/**
 * Shape-stable reaction summary for chat messages.
 * Keys: emoji, count, selfReacted, users — always in this order.
 * `count` is guaranteed to be a Smi integer (32-bit signed int).
 */
export interface ReactionSummaryShape<U = unknown> {
  emoji: string;
  count: number;
  selfReacted: boolean;
  users: U[];
}

export function makeReactionSummary<U = unknown>(
  emoji: string,
  count: number,
  selfReacted: boolean,
  users: U[],
): ReactionSummaryShape<U> {
  return {
    emoji,
    count: count | 0,
    selfReacted: Boolean(selfReacted),
    users,
  };
}

// ─── Notification Unread Counts ──────────────────────────────────────────────

/**
 * Shape-stable notification unread count summary.
 * Keys: total, likes, comments, follows, mentions, reposts, system — always in this order.
 * All fields are coerced to 32-bit Smi integers to prevent HeapNumber allocations.
 */
export interface NotificationUnreadCountsShape {
  readonly total: number;
  readonly likes: number;
  readonly comments: number;
  readonly follows: number;
  readonly mentions: number;
  readonly reposts: number;
  readonly system: number;
}

export function makeNotificationUnreadCounts(
  total: number,
  likes = 0,
  comments = 0,
  follows = 0,
  mentions = 0,
  reposts = 0,
  system = 0,
): NotificationUnreadCountsShape {
  return {
    total: total | 0,
    likes: likes | 0,
    comments: comments | 0,
    follows: follows | 0,
    mentions: mentions | 0,
    reposts: reposts | 0,
    system: system | 0,
  };
}
