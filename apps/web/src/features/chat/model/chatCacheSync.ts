import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import type {
  ConversationView,
  InfiniteMessagesData,
  MessageView,
  PaginatedMessages,
} from '@/entities/chat/model/types';
import { nextMessageStatus, type MessageDeliveryStatus } from './messageStatus';

/**
 * Enterprise Socket.io ⇄ TanStack Query cache sync layer.
 *
 * Single place where WS events mutate the query cache. All realtime hooks
 * MUST go through these pure helpers instead of inline `setQueryData`
 * closures — this guarantees:
 * - `setQueryData` without extra REST roundtrips,
 * - idempotent upserts (dedupe by id / tempId / clientMessageId),
 * - forward-only delivery-status transitions,
 * - bounded page sizes (no unbounded RAM growth).
 */

export const CHAT_CACHE_PAGE_HARD_LIMIT = 200;

export function messageIdentity(m: Pick<MessageView, 'id' | 'tempId' | 'clientMessageId'>): string {
  return m.id || m.tempId || m.clientMessageId || '';
}

function matchesIdentity(
  m: Pick<MessageView, 'id' | 'tempId' | 'clientMessageId'>,
  id: string,
  clientMessageId?: string | null,
): boolean {
  if (id && (m.id === id || m.tempId === id || m.clientMessageId === id)) return true;
  if (
    clientMessageId &&
    (m.id === clientMessageId ||
      m.tempId === clientMessageId ||
      m.clientMessageId === clientMessageId)
  ) {
    return true;
  }
  return false;
}

export function sortMessagesChronologically(messages: MessageView[]): MessageView[] {
  return [...messages].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    if (a.sender?.id === b.sender?.id && a.clientSeq != null && b.clientSeq != null) {
      return a.clientSeq - b.clientSeq;
    }
    return (a.id || '').localeCompare(b.id || '');
  });
}

/** Dedupe preserving first occurrence (used after merges / gap-fills). */
export function dedupeMessages(messages: MessageView[]): MessageView[] {
  const seen = new Set<string>();
  const out: MessageView[] = [];
  for (const m of messages) {
    const ids = [m.id, m.tempId, m.clientMessageId].filter(Boolean) as string[];
    const alreadySeen = ids.some((id) => seen.has(id));
    if (alreadySeen) continue;
    for (const id of ids) {
      seen.add(id);
    }
    out.push(m);
  }
  return out;
}

function clampPages(pages: PaginatedMessages[]): PaginatedMessages[] {
  if (pages.length === 0) return pages;
  const [head, ...rest] = pages;
  if (head.data.length <= CHAT_CACHE_PAGE_HARD_LIMIT) return pages;
  return [{ ...head, data: head.data.slice(0, CHAT_CACHE_PAGE_HARD_LIMIT) }, ...rest];
}

export function upsertMessageIntoPages(
  pages: PaginatedMessages[],
  incoming: MessageView,
  opts?: { status?: MessageDeliveryStatus },
): PaginatedMessages[] {
  const withStatus: MessageView = opts?.status
    ? {
        ...incoming,
        status: nextMessageStatus(
          (incoming as MessageView).status,
          opts.status,
        ) as MessageView['status'],
      }
    : incoming;

  const targetClientMsgId = withStatus.clientMessageId || withStatus.tempId;

  let replaced = false;
  const mapped = pages.map((page) => ({
    ...page,
    data: page.data.map((m) => {
      if (matchesIdentity(m, withStatus.id, targetClientMsgId)) {
        replaced = true;
        // Never regress delivery status on echo/replay (e.g. SENT echo
        // must not overwrite a locally-advanced DELIVERED).
        const mergedStatus = nextMessageStatus(
          m.status,
          (withStatus.status as MessageDeliveryStatus) ?? 'sent',
        );
        return {
          ...withStatus,
          clientMessageId: withStatus.clientMessageId || m.clientMessageId,
          tempId: withStatus.tempId || m.tempId,
          status: mergedStatus as MessageView['status'],
        };
      }
      return m;
    }),
  }));

  if (!replaced) {
    if (mapped.length === 0) {
      return [{ data: [withStatus], hasMore: false, nextCursor: null }];
    }
    const next = [...mapped];
    next[0] = { ...next[0], data: dedupeMessages([withStatus, ...next[0].data]) };
    return clampPages(next);
  }
  return mapped;
}

export function mapCachedMessages(
  pages: PaginatedMessages[],
  fn: (m: MessageView) => MessageView,
): PaginatedMessages[] {
  return pages.map((page) => ({ ...page, data: page.data.map(fn) }));
}

/** Merge a REST delta (`after`-cursor) into cached pages, deduped + sorted. */
export function mergeDeltaIntoPages(
  pages: PaginatedMessages[],
  delta: MessageView[],
): PaginatedMessages[] {
  if (delta.length === 0) return pages;
  if (pages.length === 0) {
    return [
      {
        data: sortMessagesChronologically(dedupeMessages(delta)).reverse(),
        hasMore: false,
        nextCursor: null,
      },
    ];
  }
  const existingIds = new Set(pages.flatMap((p) => p.data.map((m) => messageIdentity(m))));
  const fresh = delta.filter((m) => !existingIds.has(messageIdentity(m)));
  if (fresh.length === 0) return pages;
  // Pages store newest-first; delta arrives oldest-first — prepend reversed fresh.
  const merged = [...[...fresh].reverse(), ...pages[0].data];
  const deduped = dedupeMessages(merged).slice(0, CHAT_CACHE_PAGE_HARD_LIMIT);
  return [{ ...pages[0], data: deduped }, ...pages.slice(1)];
}

// ─── QueryClient-bound helpers ───────────────────────────────────────────────

export function getCachedPages(
  queryClient: QueryClient,
  conversationId: string,
): PaginatedMessages[] | undefined {
  return queryClient.getQueryData<InfiniteMessagesData>(
    queryKeys.conversations.messages(conversationId),
  )?.pages;
}

export function updateCachedPages(
  queryClient: QueryClient,
  conversationId: string,
  updater: (pages: PaginatedMessages[]) => PaginatedMessages[],
): void {
  queryClient.setQueryData<InfiniteMessagesData>(
    queryKeys.conversations.messages(conversationId),
    (prev) => (prev ? { ...prev, pages: updater(prev.pages) } : prev),
  );
}

/** WS `newMessage` → cache. No REST refetch. Emits nothing; caller handles acks. */
export function applyIncomingMessage(
  queryClient: QueryClient,
  conversationId: string,
  message: MessageView,
  opts?: { status?: MessageDeliveryStatus },
): void {
  updateCachedPages(queryClient, conversationId, (pages) =>
    upsertMessageIntoPages(pages, message, opts),
  );
}

/** WS `messageDelivered` → forward-only status promotion. */
export function applyMessageDelivered(
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
): void {
  updateCachedPages(queryClient, conversationId, (pages) =>
    mapCachedMessages(pages, (m) =>
      m.id === messageId
        ? { ...m, status: nextMessageStatus(m.status, 'delivered') as MessageView['status'] }
        : m,
    ),
  );
}

/**
 * WS `messageRead` → mark readBy + promote own SENT/DELIVERED messages to READ
 * when the reader is NOT the sender (peer read receipt). Watermark semantics:
 * with explicit messageId, everything at/before readAt is considered read.
 */
export function applyMessageRead(
  queryClient: QueryClient,
  conversationId: string,
  payload: { userId: string; messageId?: string | null; readAt: string },
): void {
  const readTimestamp = payload.readAt ? new Date(payload.readAt).getTime() : Date.now();
  updateCachedPages(queryClient, conversationId, (pages) =>
    mapCachedMessages(pages, (m) => {
      const msgTime = new Date(m.createdAt).getTime();
      const isUpToWatermark = payload.messageId
        ? m.id === payload.messageId || msgTime <= readTimestamp
        : true;
      if (!isUpToWatermark) return m;
      let next = m;
      if (!m.readBy.includes(payload.userId)) {
        next = { ...next, readBy: [...m.readBy, payload.userId] };
      }
      // Own messages become READ once a peer reads them.
      if (m.sender?.id !== payload.userId && (m.status === 'SENT' || m.status === 'DELIVERED')) {
        next = { ...next, status: 'READ' as const };
      }
      return next;
    }),
  );
}

/** WS reaction add/remove → replace the full message (server is authoritative). */
export function applyReactionMessage(
  queryClient: QueryClient,
  conversationId: string,
  message: MessageView,
  currentUserId: string | null,
): void {
  const synced: MessageView = {
    ...message,
    reactions: (message.reactions || []).map((r) => ({
      ...r,
      selfReacted: currentUserId
        ? (r.users?.some((u) => u.id === currentUserId) ?? false) || r.selfReacted
        : r.selfReacted,
    })),
  };
  updateCachedPages(queryClient, conversationId, (pages) =>
    mapCachedMessages(pages, (m) => (m.id === synced.id ? synced : m)),
  );
}

/** WS `conversationUpdated` and friends → patch the list entry + detail alias. */
export function applyConversationPatch(
  queryClient: QueryClient,
  updated: Partial<ConversationView> & { id: string },
): void {
  queryClient.setQueryData<ConversationView[]>(queryKeys.conversations.root, (prev) =>
    prev?.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
  );
  queryClient.setQueryData<ConversationView>(queryKeys.conversations.detail(updated.id), (prev) =>
    prev ? { ...prev, ...updated } : prev,
  );
  // Legacy singular key (['conversation', id]) — kept in sync during migration.
  queryClient.setQueryData<ConversationView>(
    queryKeys.conversations.detailAlias(updated.id),
    (prev) => (prev ? { ...prev, ...updated } : prev),
  );
}

/** WS `messagesCleared` → wipe pages AND list preview atomically (no refetch). */
export function applyMessagesCleared(queryClient: QueryClient, conversationId: string): void {
  queryClient.setQueryData<InfiniteMessagesData>(queryKeys.conversations.messages(conversationId), {
    pages: [{ data: [], hasMore: false, nextCursor: null }],
    pageParams: [undefined],
  });
  queryClient.setQueryData<ConversationView[]>(queryKeys.conversations.root, (prev) =>
    prev?.map((c) => (c.id === conversationId ? { ...c, lastMessage: null, unreadCount: 0 } : c)),
  );
}

/** WS `conversationDeleted` → drop list entry + cached pages. */
export function applyConversationDeleted(queryClient: QueryClient, conversationId: string): void {
  queryClient.setQueryData<ConversationView[]>(queryKeys.conversations.root, (prev) =>
    prev?.filter((c) => c.id !== conversationId),
  );
  queryClient.removeQueries({ queryKey: queryKeys.conversations.messages(conversationId) });
}

/** REST gap-fill delta → merge without losing optimistic rows. */
export function applyRestDelta(
  queryClient: QueryClient,
  conversationId: string,
  delta: MessageView[],
): number {
  if (delta.length === 0) return 0;
  let applied = 0;
  updateCachedPages(queryClient, conversationId, (pages) => {
    const before = pages.reduce((n, p) => n + p.data.length, 0);
    const merged = mergeDeltaIntoPages(pages, delta);
    applied = merged.reduce((n, p) => n + p.data.length, 0) - before;
    return merged;
  });
  return applied;
}

/** Latest local message id (snowflake-ordered REST cursor) for `after` delta. */
export function getLatestLocalMessageId(
  queryClient: QueryClient,
  conversationId: string,
): string | undefined {
  const pages = getCachedPages(queryClient, conversationId);
  if (!pages) return undefined;
  // Pages are newest-first; scan head pages for the max snowflake id.
  for (const page of pages) {
    for (const m of page.data) {
      if (m.id && !m.id.startsWith('client_') && !m.id.startsWith('fwd_')) return m.id;
    }
  }
  return undefined;
}
