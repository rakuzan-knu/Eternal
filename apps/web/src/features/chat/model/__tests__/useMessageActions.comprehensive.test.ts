import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMessageActions } from '../useMessageActions';
import { CONVERSATION_MESSAGES_KEY, queryKeys } from '@/shared/api/queryKeys';
import type { InfiniteMessagesData } from '@/entities/chat';
import { mutationOutbox } from '@/shared/lib/outbox/mutationOutbox';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { chatApi } from '@/features/chat/api/chatApi';
import * as socketHookModule from '../useChatSocket';

describe('useMessageActions (Comprehensive Suite)', () => {
  let queryClient: QueryClient;
  let mockSocket: { emit: ReturnType<typeof vi.fn>; connected: boolean };

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
      connected: true,
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
    vi.unstubAllGlobals();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('preserves explicit mentions through optimistic send, outbox, HTTP fallback and retry', async () => {
    queryClient.setQueryData(queryKeys.conversations.root, [
      {
        id: 'conv-1',
        participants: [
          {
            userId: 'peer',
            user: { id: 'peer', username: 'peer', displayName: null, avatar: null },
          },
        ],
      },
    ]);
    const enqueue = vi.spyOn(mutationOutbox, 'enqueueMessage');
    mockSocket.emit.mockImplementation((event, _payload, cb) => {
      if (event === 'sendMessage' && cb) cb({ status: 'error', error: 'offline' });
    });
    const send = vi.spyOn(chatApi, 'sendMessage').mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });
    await act(async () => {
      await expect(result.current.sendMessage('Hi @PEER and @unknown')).rejects.toThrow();
    });
    const row = queryClient.getQueryData<InfiniteMessagesData>(
      queryKeys.conversations.messages('conv-1'),
    )?.pages[0].data[0];
    expect(row?.mentionedUserIds).toEqual(['peer']);
    expect(enqueue).toHaveBeenCalledWith(
      row?.id,
      expect.objectContaining({ mentionedUserIds: ['peer'] }),
      false,
    );
    expect(send).toHaveBeenLastCalledWith(
      'conv-1',
      expect.objectContaining({ mentionedUserIds: ['peer'] }),
    );
    // A retry must retain original metadata even if participant data has since changed.
    queryClient.setQueryData(queryKeys.conversations.root, []);
    await act(async () => {
      await expect(result.current.retrySendMessage(row?.id ?? '')).rejects.toThrow();
    });
    expect(send).toHaveBeenLastCalledWith(
      'conv-1',
      expect.objectContaining({ mentionedUserIds: ['peer'], clientMessageId: row?.id }),
    );
    const socketPayloads = mockSocket.emit.mock.calls
      .filter(([event]) => event === 'sendMessage')
      .map(([, payload]) => payload);
    expect(socketPayloads).toHaveLength(2);
    for (const payload of socketPayloads) expect(payload.mentionedUserIds).toEqual(['peer']);
  });

  it.each([false, true])(
    'reuploads public media for a private target (hide author: %s)',
    async (hideAuthor) => {
      const target: Awaited<ReturnType<typeof chatApi.getConversation>> = {
        id: 'private-target',
        type: 'GROUP',
        name: 'Private',
        avatar: null,
        description: null,
        createdById: 'user-1',
        participants: [],
        lastMessage: null,
        unreadCount: 0,
        myTheme: 'default',
        myMuteLevel: 'NONE',
        myNickname: null,
        isArchived: false,
        isPinned: false,
        blockedByMe: false,
        blockingMe: false,
        isBlocked: false,
        pinnedMessages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        communityChannelIsPrivate: true,
      };
      vi.spyOn(chatApi, 'getConversation').mockResolvedValue(target);
      const upload = vi.spyOn(chatApi, 'uploadAttachment').mockResolvedValue({
        type: 'IMAGE',
        url: 'private-media://11111111-1111-4111-8111-111111111111',
        thumbnailUrl: 'https://public.example/untrusted-thumbnail.jpg',
      });
      const send = vi
        .spyOn(chatApi, 'sendMessage')
        .mockRejectedValue(new Error('stop after payload'));
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('image bytes', {
          headers: { 'Content-Type': 'image/png' },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);
      const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });
      await act(async () => {
        await expect(
          result.current.forwardMessage(
            {
              id: 'source-message',
              conversationId: 'conv-1',
              body: 'Caption',
              attachments: [
                {
                  id: 'source-file',
                  type: 'IMAGE',
                  url: 'https://public.example/image.png',
                  fileName: 'image.png',
                  mimeType: 'image/png',
                  size: 11,
                  width: null,
                  height: null,
                  duration: null,
                  thumbnailUrl: 'https://public.example/thumbnail.png',
                },
              ],
            },
            ['private-target'],
            { hideAuthor },
          ),
        ).rejects.toThrow('stop after payload');
      });
      expect(fetchMock).toHaveBeenCalledWith('https://public.example/image.png', {
        credentials: 'omit',
      });
      expect(upload).toHaveBeenCalledWith('private-target', expect.any(File));
      expect(upload.mock.calls[0][1].size).toBe(11);
      expect(send).toHaveBeenCalledWith('private-target', {
        text: 'Caption',
        forwardedFromId: hideAuthor ? undefined : 'source-message',
        attachments: [
          {
            type: 'IMAGE',
            url: 'private-media://11111111-1111-4111-8111-111111111111',
            thumbnailUrl: null,
          },
        ],
      });
      expect(mockSocket.emit).not.toHaveBeenCalled();
    },
  );

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
});
