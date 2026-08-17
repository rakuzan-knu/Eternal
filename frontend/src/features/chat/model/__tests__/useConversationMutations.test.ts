import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMuteConversation, useMarkConversationRead } from '../useConversationMutations';
import { chatApi } from '../../api/chatApi';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { ConversationView } from '@/entities/chat/model/types';

describe('useConversationMutations', () => {
  const mockConv = {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    avatar: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 5,
    myMuteLevel: 'NONE',
    isPinned: false,
    participants: [
      {
        userId: 'usr-2',
        role: 'MEMBER',
        mutedUntil: null,
        joinedAt: new Date().toISOString(),
        nickname: null,
        theme: 'DEFAULT',
        muteLevel: 'NONE',
        user: {
          id: 'usr-2',
          username: 'alice',
          displayName: 'Alice',
          avatar: null,
        },
      },
    ],
  } as unknown as ConversationView;

  it('optimistically mutes conversation', async () => {
    vi.spyOn(chatApi, 'mute').mockResolvedValue({} as unknown as ConversationView);
    const queryClient = new QueryClient();
    queryClient.setQueryData([CONVERSATIONS_KEY], [mockConv]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useMuteConversation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        conversationId: 'conv-1',
        muteLevel: 'MESSAGES_AND_CALLS',
      });
    });

    const cached = queryClient.getQueryData<ConversationView[]>([CONVERSATIONS_KEY]);
    expect(cached?.[0].myMuteLevel).toBe('MESSAGES_AND_CALLS');
  });

  it('optimistically marks conversation as read', async () => {
    vi.spyOn(chatApi, 'markRead').mockResolvedValue({ success: true } as unknown as {
      success: boolean;
      unreadCount: number;
    });
    const queryClient = new QueryClient();
    queryClient.setQueryData([CONVERSATIONS_KEY], [mockConv]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useMarkConversationRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('conv-1');
    });

    const cached = queryClient.getQueryData<ConversationView[]>([CONVERSATIONS_KEY]);
    expect(cached?.[0].unreadCount).toBe(0);
  });
});
