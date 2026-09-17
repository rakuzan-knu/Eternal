import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMessageActions } from '../useMessageActions';
import { CONVERSATION_MESSAGES_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { chatApi } from '@/features/chat/api/chatApi';
import * as socketHookModule from '../useChatSocket';

describe('useMessageActions (Comprehensive Suite)', () => {
  let queryClient: QueryClient;
  let mockSocket: { emit: ReturnType<typeof vi.fn> };

  const initialMessagesData = {
    pages: [
      {
        data: [
          {
            id: 'msg-1',
            conversationId: 'conv-1',
            sender: { id: 'user-1', username: 'alice', displayName: 'Alice', avatar: null },
            body: 'Hello there!',
            reactions: [],
            readBy: [],
            isEdited: false,
            isDeleted: false,
            isPinned: false,
            createdAt: new Date().toISOString(),
          },
        ],
        hasMore: false,
        nextCursor: null,
      },
    ],
    pageParams: [undefined],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSocket = {
      emit: vi.fn(),
    };
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData([CONVERSATION_MESSAGES_KEY, 'conv-1'], initialMessagesData);

    useAuthStore.setState({ userId: 'user-1' });
    vi.spyOn(socketHookModule, 'useChatSocket').mockReturnValue(mockSocket as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('sends message optimistically and handles socket ack', async () => {
    mockSocket.emit.mockImplementation((event, payload, cb) => {
      if (event === 'sendMessage' && cb) {
        cb({
          status: 'ok',
          message: {
            id: 'server-msg-1',
            conversationId: 'conv-1',
            sender: { id: 'user-1', username: 'alice', displayName: 'Alice', avatar: null },
            body: 'My new message',
            reactions: [],
            readBy: [],
            isEdited: false,
            isDeleted: false,
            isPinned: false,
            createdAt: new Date().toISOString(),
          },
        });
      }
    });

    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });

    await act(async () => {
      await result.current.sendMessage('My new message');
    });

    const state = queryClient.getQueryData<any>([CONVERSATION_MESSAGES_KEY, 'conv-1']);
    expect(state.pages[0].data[0].id).toBe('server-msg-1');
    expect(state.pages[0].data[0].status).toBe('SENT');
  });

  it('falls back to chatApi.sendMessage if socket times out or errors', async () => {
    mockSocket.emit.mockImplementation((event, payload, cb) => {
      if (event === 'sendMessage' && cb) {
        cb({ status: 'error', error: 'Socket disconnected' });
      }
    });

    vi.spyOn(chatApi, 'sendMessage').mockResolvedValue({
      id: 'http-msg-1',
      conversationId: 'conv-1',
      sender: { id: 'user-1', username: 'alice', displayName: 'Alice', avatar: null },
      body: 'HTTP message fallback',
      reactions: [],
      readBy: [],
      isEdited: false,
      isDeleted: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
    } as any);

    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });

    await act(async () => {
      await result.current.sendMessage('HTTP message fallback');
    });

    expect(chatApi.sendMessage).toHaveBeenCalledWith(
      'conv-1',
      expect.objectContaining({
        text: 'HTTP message fallback',
      }),
    );
  });

  it('adds and removes reactions with optimistic cache updates', async () => {
    mockSocket.emit.mockImplementation((event, payload, cb) => {
      if (cb) cb({ status: 'ok' });
    });

    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });

    await act(async () => {
      await result.current.addReaction('msg-1', '🚀');
    });

    let state = queryClient.getQueryData<any>([CONVERSATION_MESSAGES_KEY, 'conv-1']);
    expect(state.pages[0].data[0].reactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ emoji: '🚀', count: 1, selfReacted: true }),
      ]),
    );

    await act(async () => {
      await result.current.removeReaction('msg-1', '🚀');
    });

    state = queryClient.getQueryData<any>([CONVERSATION_MESSAGES_KEY, 'conv-1']);
    expect(state.pages[0].data[0].reactions.find((r: any) => r.emoji === '🚀')).toBeUndefined();
  });

  it('performs batch delete of messages with chatApi', async () => {
    vi.spyOn(chatApi, 'batchDeleteMessages').mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });

    await act(async () => {
      await result.current.batchDeleteMessages(['msg-1'], true);
    });

    expect(chatApi.batchDeleteMessages).toHaveBeenCalledWith('conv-1', ['msg-1'], true);
    const state = queryClient.getQueryData<any>([CONVERSATION_MESSAGES_KEY, 'conv-1']);
    expect(state.pages[0].data[0].isDeleted).toBe(true);
  });

  it('loads newer and older messages, around date/id, and resets to live', async () => {
    const mockNewMsg = {
      id: 'msg-new-1',
      conversationId: 'conv-1',
      sender: { id: 'u1', username: 'alice', displayName: 'Alice', avatar: null },
      body: 'New message',
      reactions: [],
      readBy: [],
      isEdited: false,
      isDeleted: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
    };

    vi.spyOn(chatApi, 'getMessages').mockResolvedValue({
      data: [mockNewMsg as any],
      hasMore: false,
      nextCursor: null,
    });
    vi.spyOn(chatApi, 'getMessagesAround').mockResolvedValue({
      data: [mockNewMsg as any],
      hasMore: false,
      nextCursor: null,
    });
    vi.spyOn(chatApi, 'getMessagesAroundDate').mockResolvedValue({
      data: [mockNewMsg as any],
      hasMore: false,
      nextCursor: null,
    });

    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });

    await act(async () => {
      await result.current.loadNewerMessages('msg-1');
      await result.current.loadOlderMessages('msg-1');
      await result.current.loadAroundMessages('msg-1');
      await result.current.loadAroundDate('2026-08-28');
      await result.current.resetToLive();
    });

    expect(chatApi.getMessages).toHaveBeenCalled();

    // conversationId null guards
    const { result: nullResult } = renderHook(() => useMessageActions(null), { wrapper });
    await act(async () => {
      await nullResult.current.loadNewerMessages('msg-1');
      await nullResult.current.loadOlderMessages('msg-1');
      await nullResult.current.loadAroundMessages('msg-1');
      await nullResult.current.loadAroundDate('2026-08-28');
      await nullResult.current.resetToLive();
    });
  });
});
