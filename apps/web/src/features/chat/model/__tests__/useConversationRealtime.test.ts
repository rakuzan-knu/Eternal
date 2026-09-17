import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConversationRealtime } from '../useConversationRealtime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { CONVERSATIONS_KEY, CONVERSATION_MESSAGES_KEY } from '@/shared/api/queryKeys';
import type { ConversationView } from '@/entities/chat/model/types';

const registeredHandlers: Record<string, (payload: any) => void> = {};

vi.mock('../useChatSocketEvent', () => ({
  useChatSocketEvent: (event: string, handler: (payload: any) => void) => {
    registeredHandlers[event] = handler;
  },
}));

describe('useConversationRealtime', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    for (const key in registeredHandlers) {
      delete registeredHandlers[key];
    }
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('handles typing events for the active conversation and ignores other conversations', () => {
    const { result } = renderHook(() => useConversationRealtime('conv-1'), { wrapper });

    // Ignore other conversation
    act(() => {
      registeredHandlers['typing']?.({
        conversationId: 'other-conv',
        userId: 'u1',
        isTyping: true,
      });
    });
    expect(result.current.typingUserIds.has('u1')).toBe(false);

    // Active conversation typing true
    act(() => {
      registeredHandlers['typing']?.({
        conversationId: 'conv-1',
        userId: 'u1',
        isTyping: true,
      });
    });
    expect(result.current.typingUserIds.has('u1')).toBe(true);

    // Active conversation typing false
    act(() => {
      registeredHandlers['typing']?.({
        conversationId: 'conv-1',
        userId: 'u1',
        isTyping: false,
      });
    });
    expect(result.current.typingUserIds.has('u1')).toBe(false);
  });

  it('updates and unlinks shared themes in conversations query cache', () => {
    const mockConv = {
      id: 'conv-1',
      sharedTheme: null,
      sharedThemeUpdatedAt: null,
    } as unknown as ConversationView;
    queryClient.setQueryData([CONVERSATIONS_KEY], [mockConv]);

    renderHook(() => useConversationRealtime('conv-1'), { wrapper });

    // 1. Shared theme updated
    act(() => {
      registeredHandlers['conversationSharedThemeUpdated']?.({
        conversationId: 'conv-1',
        sharedTheme: 'preset:cyberpunk',
        sharedThemeUpdatedAt: '2026-08-28T12:00:00Z',
      });
    });

    let cached = queryClient.getQueryData<ConversationView[]>([CONVERSATIONS_KEY]);
    expect(cached?.[0].sharedTheme).toBe('preset:cyberpunk');

    // 2. Shared theme unlinked
    act(() => {
      registeredHandlers['conversationSharedThemeUnlinked']?.({
        conversationId: 'conv-1',
      });
    });

    cached = queryClient.getQueryData<ConversationView[]>([CONVERSATIONS_KEY]);
    expect(cached?.[0].sharedTheme).toBeNull();
  });

  it('expires typing status automatically after 3500ms and maps across multiple conversations', () => {
    vi.useFakeTimers();
    const mockConv1 = { id: 'conv-1', sharedTheme: null } as unknown as ConversationView;
    const mockConv2 = { id: 'conv-2', sharedTheme: null } as unknown as ConversationView;
    queryClient.setQueryData([CONVERSATIONS_KEY], [mockConv1, mockConv2]);

    const { result } = renderHook(() => useConversationRealtime('conv-1'), { wrapper });

    act(() => {
      registeredHandlers['typing']?.({
        conversationId: 'conv-1',
        userId: 'u1',
        isTyping: true,
      });
    });
    expect(result.current.typingUserIds.has('u1')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3600);
    });
    expect(result.current.typingUserIds.has('u1')).toBe(false);

    // Multi-conversation theme update
    act(() => {
      registeredHandlers['conversationSharedThemeUpdated']?.({
        conversationId: 'conv-1',
        sharedTheme: 'preset:retro',
        sharedThemeUpdatedAt: '2026-08-28T12:00:00Z',
      });
    });

    const cached = queryClient.getQueryData<ConversationView[]>([CONVERSATIONS_KEY]);
    expect(cached?.[0].sharedTheme).toBe('preset:retro');
    expect(cached?.[1].sharedTheme).toBeNull();

    vi.useRealTimers();
  });

  it('handles messagePinned, messageUnpinned, messageRead, and messageReaction events', () => {
    const mockMessage = {
      id: 'm1',
      conversationId: 'conv-1',
      body: 'Hello',
      isPinned: false,
      createdAt: '2026-08-28T12:00:00Z',
      readBy: [],
      reactions: [],
    };

    queryClient.setQueryData([CONVERSATION_MESSAGES_KEY, 'conv-1'], {
      pages: [{ data: [mockMessage], hasMore: false, nextCursor: null }],
    });

    renderHook(() => useConversationRealtime('conv-1'), { wrapper });

    // 1. messagePinned
    act(() => {
      registeredHandlers['messagePinned']?.({
        conversationId: 'conv-1',
        messageId: 'm1',
      });
    });

    const msgsAfterPin: any = queryClient.getQueryData([CONVERSATION_MESSAGES_KEY, 'conv-1']);
    expect(msgsAfterPin.pages[0].data[0].isPinned).toBe(true);

    // 2. messageUnpinned
    act(() => {
      registeredHandlers['messageUnpinned']?.({
        conversationId: 'conv-1',
        messageId: 'm1',
      });
    });

    const msgsAfterUnpin: any = queryClient.getQueryData([CONVERSATION_MESSAGES_KEY, 'conv-1']);
    expect(msgsAfterUnpin.pages[0].data[0].isPinned).toBe(false);

    // 3. messageRead
    act(() => {
      registeredHandlers['messageRead']?.({
        conversationId: 'conv-1',
        userId: 'usr-reader',
        messageId: 'm1',
        readAt: '2026-08-28T12:05:00Z',
      });
    });

    const msgsAfterRead: any = queryClient.getQueryData([CONVERSATION_MESSAGES_KEY, 'conv-1']);
    expect(msgsAfterRead.pages[0].data[0].readBy).toContain('usr-reader');

    // 4. messageReactionAdded & messageReactionRemoved
    act(() => {
      registeredHandlers['messageReactionAdded']?.({
        conversationId: 'conv-1',
        message: {
          ...mockMessage,
          reactions: [{ emoji: '🔥', count: 1, users: [{ id: 'usr-1' }], selfReacted: true }],
        },
      });
    });

    const msgsAfterReact: any = queryClient.getQueryData([CONVERSATION_MESSAGES_KEY, 'conv-1']);
    expect(msgsAfterReact.pages[0].data[0].reactions).toHaveLength(1);
  });
});
