import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import {
  applyConversationDeleted,
  applyConversationPatch,
  applyIncomingMessage,
  applyMessageDelivered,
  applyMessageRead,
  applyMessagesCleared,
  applyReactionMessage,
  applyRestDelta,
  dedupeMessages,
  getLatestLocalMessageId,
  mergeDeltaIntoPages,
  sortMessagesChronologically,
  upsertMessageIntoPages,
} from '../chatCacheSync';
import type {
  ConversationView,
  InfiniteMessagesData,
  MessageView,
} from '@/entities/chat/model/types';

function msg(partial: Partial<MessageView> & { id: string }): MessageView {
  return {
    conversationId: 'conv-1',
    sender: { id: 'u1', username: 'u1', displayName: null, avatar: null },
    body: 'hi',
    messageType: 'TEXT',
    replyTo: null,
    forwardedFrom: null,
    attachments: [],
    reactions: [],
    readBy: [],
    isEdited: false,
    isDeleted: false,
    isPinned: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    editedAt: null,
    ...partial,
  } as MessageView;
}

function seedMessages(client: QueryClient, messages: MessageView[]) {
  client.setQueryData<InfiniteMessagesData>(queryKeys.conversations.messages('conv-1'), {
    pages: [{ data: messages, hasMore: false, nextCursor: null }],
    pageParams: [undefined],
  });
}

function readMessages(client: QueryClient): MessageView[] {
  return (
    client.getQueryData<InfiniteMessagesData>(queryKeys.conversations.messages('conv-1'))?.pages[0]
      ?.data ?? []
  );
}

describe('chatCacheSync', () => {
  let client: QueryClient;
  beforeEach(() => {
    client = new QueryClient();
  });

  it('upserts incoming messages idempotently (dedupe by id/clientMessageId)', () => {
    const pages = upsertMessageIntoPages([], msg({ id: 'm1' }));
    expect(pages[0].data).toHaveLength(1);
    const again = upsertMessageIntoPages(pages, msg({ id: 'm1', body: 'updated' }));
    expect(again[0].data).toHaveLength(1);

    // optimistic echo replaced by server id via clientMessageId
    const optimistic = upsertMessageIntoPages(
      [],
      msg({ id: 'client_1', tempId: 'client_1', clientMessageId: 'client_1', status: 'SENDING' }),
    );
    const echoed = upsertMessageIntoPages(optimistic, {
      ...msg({ id: 'srv-1' }),
      clientMessageId: 'client_1',
    });
    expect(echoed[0].data).toHaveLength(1);
  });

  it('never regresses delivery status on echo', () => {
    seedMessages(client, [msg({ id: 'm1', status: 'DELIVERED' })]);
    applyIncomingMessage(client, 'conv-1', msg({ id: 'm1', status: 'SENT' }));
    expect(readMessages(client)[0].status).toBe('DELIVERED');
  });

  it('promotes pending → sent → delivered → read forward-only', () => {
    seedMessages(client, [msg({ id: 'm1', status: 'SENDING', sender: { id: 'me' } } as never)]);
    applyMessageDelivered(client, 'conv-1', 'm1');
    expect(readMessages(client)[0].status).toBe('DELIVERED');
    // second delivered is a no-op, stays delivered
    applyMessageDelivered(client, 'conv-1', 'm1');
    expect(readMessages(client)[0].status).toBe('DELIVERED');

    applyMessageRead(client, 'conv-1', {
      userId: 'peer',
      messageId: 'm1',
      readAt: '2026-01-02T00:00:00.000Z',
    });
    const after = readMessages(client)[0];
    expect(after.readBy).toContain('peer');
    expect(after.status).toBe('READ');
  });

  it('patches reactions from server truth', () => {
    seedMessages(client, [msg({ id: 'm1' })]);
    applyReactionMessage(
      client,
      'conv-1',
      msg({
        id: 'm1',
        reactions: [
          { emoji: '🔥', count: 1, selfReacted: false, users: [{ id: 'peer' }] } as never,
        ],
      }),
      'me',
    );
    expect(readMessages(client)[0].reactions).toHaveLength(1);
  });

  it('merges REST deltas without duplicating cached rows', () => {
    const pages = [
      { data: [msg({ id: 'm2' }), msg({ id: 'm1' })], hasMore: false, nextCursor: null },
    ];
    const merged = mergeDeltaIntoPages(pages, [msg({ id: 'm1' }), msg({ id: 'm3' })]);
    const ids = merged[0].data.map((m) => m.id);
    expect(ids).toContain('m1');
    expect(ids).toContain('m2');
    expect(ids).toContain('m3');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('applyRestDelta writes through the QueryClient', () => {
    seedMessages(client, [msg({ id: 'm1' })]);
    const applied = applyRestDelta(client, 'conv-1', [msg({ id: 'm1' }), msg({ id: 'm2' })]);
    expect(applied).toBe(1);
    expect(
      readMessages(client)
        .map((m) => m.id)
        .sort(),
    ).toEqual(['m1', 'm2']);
  });

  it('getLatestLocalMessageId skips optimistic rows (Snowflake cursor)', () => {
    seedMessages(client, [
      msg({ id: 'client_9', tempId: 'client_9', createdAt: '2026-01-03T00:00:00.000Z' }),
      msg({ id: '9007199254740993', createdAt: '2026-01-02T00:00:00.000Z' }),
    ]);
    expect(getLatestLocalMessageId(client, 'conv-1')).toBe('9007199254740993');
  });

  it('clears messages + list preview atomically', () => {
    seedMessages(client, [msg({ id: 'm1' })]);
    client.setQueryData<ConversationView[]>(queryKeys.conversations.root, [
      { id: 'conv-1', lastMessage: msg({ id: 'm1' }), unreadCount: 5 } as ConversationView,
    ]);
    applyMessagesCleared(client, 'conv-1');
    expect(readMessages(client)).toHaveLength(0);
    const list = client.getQueryData<ConversationView[]>(queryKeys.conversations.root);
    expect(list?.[0].lastMessage).toBeNull();
    expect(list?.[0].unreadCount).toBe(0);
  });

  it('patches + removes conversations', () => {
    client.setQueryData<ConversationView[]>(queryKeys.conversations.root, [
      { id: 'conv-1', name: 'Old' } as ConversationView,
    ]);
    applyConversationPatch(client, { id: 'conv-1', name: 'New' });
    expect(client.getQueryData<ConversationView[]>(queryKeys.conversations.root)?.[0].name).toBe(
      'New',
    );
    applyConversationDeleted(client, 'conv-1');
    expect(client.getQueryData<ConversationView[]>(queryKeys.conversations.root)).toHaveLength(0);
  });

  it('sorts + dedupes helpers', () => {
    const a = msg({ id: 'a', createdAt: '2026-01-02T00:00:00.000Z' });
    const b = msg({ id: 'b', createdAt: '2026-01-01T00:00:00.000Z' });
    expect(sortMessagesChronologically([a, b]).map((m) => m.id)).toEqual(['b', 'a']);
    expect(dedupeMessages([a, a, b]).map((m) => m.id)).toEqual(['a', 'b']);
  });
});
