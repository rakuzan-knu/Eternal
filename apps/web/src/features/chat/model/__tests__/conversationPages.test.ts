import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/shared/api/queryKeys';
import { applyConversationPatch, applyConversationDeleted } from '../chatCacheSync';
import { createRealtimeChatBatch } from '../realtimeChatBatch';
import type { InfiniteConversationsData } from '@/entities/chat/model/types';
import { useAuthStore } from '@/shared/model/useAuthStore';

describe('paged conversation realtime cache', () => {
  it('does not patch pages belonging to a previous account', () => {
    const client = new QueryClient();
    useAuthStore.setState({ userId: 'current', isAuthenticated: true });
    const key = queryKeys.conversations.page('previous', { filter: 'ALL' });
    const data = {
      pages: [
        {
          data: [{ id: 'same-dialog', unreadCount: 7 }],
          nextCursor: null,
          hasMore: false,
          order: 'activityAt',
        },
      ],
      pageParams: [undefined],
    } as InfiniteConversationsData;
    client.setQueryData(key, data);
    applyConversationPatch(client, { id: 'same-dialog', unreadCount: 0 });
    expect(client.getQueryData<InfiniteConversationsData>(key)).toBe(data);
  });
  it('coalesces updates across loaded pages without moving cursor boundaries', () => {
    const client = new QueryClient();
    useAuthStore.setState({ userId: 'viewer', isAuthenticated: true });
    const key = queryKeys.conversations.page('viewer', { filter: 'ALL' });
    const data = {
      pages: [
        {
          data: [{ id: 'a', unreadCount: 0 }],
          nextCursor: 'boundary-a',
          hasMore: true,
          order: 'activityAt',
        },
        {
          data: [{ id: 'old', unreadCount: 0 }],
          nextCursor: 'boundary-old',
          hasMore: true,
          order: 'activityAt',
        },
      ],
      pageParams: [undefined, 'boundary-a'],
    } as InfiniteConversationsData;
    client.setQueryData(key, data);
    const batch = createRealtimeChatBatch(client);
    const release = batch.retain();
    batch.enqueue((cache) => applyConversationPatch(cache, { id: 'old', unreadCount: 1 }));
    batch.enqueue((cache) => applyConversationPatch(cache, { id: 'old', unreadCount: 2 }));
    batch.flush();
    const result = client.getQueryData<InfiniteConversationsData>(key)!;
    expect(result.pages.flatMap((p) => p.data.map((c) => c.id))).toEqual(['a', 'old']);
    expect(result.pages[1].data[0].unreadCount).toBe(2);
    expect(result.pages[1].nextCursor).toBe('boundary-old');
    applyConversationDeleted(client, 'a');
    expect(client.getQueryData<InfiniteConversationsData>(key)!.pages[0].data).toEqual([]);
    expect(client.getQueryData<InfiniteConversationsData>(key)!.pages[0].nextCursor).toBe(
      'boundary-a',
    );
    release();
    batch.dispose();
  });
});
